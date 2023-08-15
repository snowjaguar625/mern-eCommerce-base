const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

const register = async (req, res) => {
  try {
    const user = new User(req.body);
    const newUser = await user.save();
    // console.log("New user created", newUser);
    const userToken = jwt.sign(
      { _id: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin },
      SECRET
    );
    console.log("Json web token", userToken);
    res
      .status(201)
      .cookie("userToken", userToken, {
        expires: new Date(Date.now() + 900000000),
      })
      .json({ successMessage: "user created", user: newUser });
  } catch (error) {
    // console.log("Error in Registering user", error);
    res.status(400).json(error);
  }
};

const login = async (req, res) => {
  const isAdminLogin = req.query.isAdminLogin || false;
  const userDocument = await User.findOne({ email: req.body.email });
  console.log("USER DOC", userDocument);
  if (!userDocument) {
    res.status(400).json({ error: "invalid login information" });
  } else {
    try {
      const isPasswordValid = await bcrypt.compare(
        req.body.password,
        userDocument.password
      );
      if (!isPasswordValid) {
        res.status(400).json({ error: "invalid login information" });
        // isAdmin is default to false
      } else {
        if (isAdminLogin && !userDocument.isAdmin) {
          res.status(401).json({ error: "User is not an admin" });
        } else {
          const userToken = jwt.sign(
            {
              _id: userDocument._id,
              email: userDocument.email,
              isAdmin: userDocument.isAdmin,
            },
            SECRET
          );
          console.log("Json  web token", userToken);
          res
            .status(201)
            .cookie("userToken", userToken, {
              expires: new Date(Date.now() + 900000000),
            })
            .json({ successMessage: "user logged in", user: userDocument });
        }
      }
    } catch (error) {
      console.log("Error in logging in user ", error);
      res.status(400).json({ error: "invalid login information" });
    }
  }
};

const logout = (req, res) => {
  res.clearCookie("userToken");
  res.json({ successMessage: "User logged out" });
};

const updateUser = async (req, res) => {
  try {
    const currentUser = await User.findById(req.params.id); // currentUser is the user object
    const { email, firstName, lastName, shippingAddress, billingInformation } =
      req.body; // is an object containing a key from above with it's value
    // currentUser.email = email(current email in req.body) is whatever the user enters to update the value
    // || currentUser.email is to keep the value to what it is if there is nothing provided
    currentUser.email = email || currentUser.email;
    currentUser.firstName = firstName || currentUser.firstName;
    console.log(shippingAddress);
    currentUser.lastName = lastName || currentUser.lastName;
    currentUser.shippingAddress =
      shippingAddress || currentUser.shippingAddress;
    currentUser.billingInformation =
      billingInformation || currentUser.billingInformation;
    console.log("currentUser! - ", currentUser);
    await User.findByIdAndUpdate(
      currentUser.id,
      {
        ...currentUser,
      },
      { runValidators: true }
    );
    res.status(200).json({ currentUser });
  } catch (error) {
    console.log("Error in updating user ", error);
    res.status(400).json(error);
  }
};

const getLoggedInUser = async (req, res) => {
  try {
    const currentUser = await User.findOne({ _id: req.user._id }).populate(
      "cart",
      "id productName price category description image shippingAddress billingInformation"
    );
    res.json(currentUser);
  } catch (error) {
    res.status(401).json({ error });
  }
};

const addToCart = async (req, res) => {
  try {
    const addToCartById = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $push: { cart: req.params.id } },
      { new: true, useFindAndModify: false }
    );
    res.json(addToCartById);
  } catch (err) {
    res.status(400).json({ message: "error in adding to cart", error: err });
  }
};

const removeProductFromCart = async (req, res) => {
  try {
    const currentUser = await User.findOne({
      _id: req.user._id,
    }).populate("cart");

    let deleteCounter = 0;
    const newCart = currentUser.cart.filter((cartItem) => {
      if (cartItem._id.toString() === req.params.id && deleteCounter === 0) {
        deleteCounter++;
        return false;
      }
      return true;
    });

    const updatedUserCart = await User.findByIdAndUpdate(
      currentUser.id,
      {
        $set: {
          cart: newCart,
        },
      },
      {
        new: true,
      }
    ).populate("cart");
    res.status(200).json(updatedUserCart);
  } catch (err) {
    console.log("Error in removing product from cart", err);
    res.status(400).json({
      message: "something went wrong in removing product from cart",
      error: err,
    });
  }
};

const deleteCartItemsByUserId = async (userId) => {
  try {
    return await User.findByIdAndUpdate(userId, {
      $set: {
        cart: [],
      },
    });
  } catch (err) {
    res
      .status(400)
      .json({ message: "error in delete cart items by user id", error: err });
  }
};

module.exports = {
  register,
  login,
  logout,
  getLoggedInUser,
  updateUser,
  addToCart,
  removeProductFromCart,
  deleteCartItemsByUserId,
};
