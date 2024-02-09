const express = require("express");
const router = express.Router();
const passport = require("passport");
const upload = require("./multer.js");

const userModel = require("./users");
const postModel = require("./post");

const localStrategy = require("passport-local");
passport.use(new localStrategy(userModel.authenticate()));

/* GET home page. */
router.get("/", function (req, res, next) {
  if (req.isAuthenticated()) res.redirect("/profile");
  res.render("index", { title: "Home", isLoggedIn: req.isAuthenticated() });
});

router.get("/feed", function (req, res, next) {
  res.render("feed", { title: "Feed", isLoggedIn: req.isAuthenticated() });
});

router.get("/register", function (req, res, next) {
  if (req.isAuthenticated()) res.redirect("/profile");
  res.render("register", {
    title: "Register",
    isLoggedIn: req.isAuthenticated(),
  });
});

/* Authentication Authorization: Register, Login , Logout */
// Registration
router.post("/register", function (req, res) {
  const { username, email, contact, password, fullname } = req.body;
  const userData = new userModel({
    username,
    email,
    contact,
    fullname,
  });

  userModel.register(userData, req.body.password).then(function () {
    console.log("Registration done here.");

    passport.authenticate("local")(req, res, function () {
      console.log("Registration done here. redirecting to /profile");
      res.redirect("/profile");
    });
  });
});

// Login
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/",
    failureFlash: true,
  }),
  function (req, res) {}
);

/* Secured Routes */
// logout
router.get("/logout", isLoggedIn, function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// profile route
router.get("/profile", isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("posts");

  // console.log("profile user ", user);
  res.render("profile", {
    title: "Profile Page",
    user,
    isLoggedIn: req.isAuthenticated(),
  });
  // res.send("profile page");
});

// user DP upload route
router.post(
  "/fileupload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res, next) {
    if (!req.file) {
      console.log("req.file: No file given");
      res.status(404).send("No file given");
    }

    console.log("fileupload ");
    console.log("req.file: ", req.file);
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    console.log(user);
    user.profileImage = req.file.filename;

    await user.save();
    res.redirect("/profile");

    // res.send("fileupload page done");
    // res.render("profile");
  }
);

// Add New Post
router.get("/add", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  console.log("add ");
  res.render("add", {
    title: "Add new",
    user,
    isLoggedIn: req.isAuthenticated(),
  });
  // res.send("profile page");
});

router.post(
  "/add",
  isLoggedIn,
  upload.single("postimage"),
  async function (req, res, next) {
    if (!req.file) {
      console.log("req.file: No file given");
      res.status(404).send("No file given");
    }

    console.log(req);
    console.log(req.body);

    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    const newPost = await postModel.create({
      user: user._id,
      title: req.body.title,
      description: req.body.description,
      image: req.file.filename,
    });

    user.posts.push(newPost._id);
    await user.save();

    // console.log("add ");
    res.redirect("/profile");
    // res.render("add", {
    //   title: "Add new",
    //   user,
    //   isLoggedIn: req.isAuthenticated(),
    // });
    // res.send("profile page");
  }
);

// Edit Route: Render form to edit post
router.get("/posts/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);
    res.render("editPost", {
      post,
      title: "Edit",
      isLoggedIn: req.isAuthenticated(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error editing post");
  }
});

// Update Route: Update post in the database
router.post("/posts/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.id;
    const postbody = req.body;
    console.log({ postId, postbody });
    const updatedPost = await postModel.findByIdAndUpdate(
      postId,
      req.body,
      { new: true } // Return the updated document
    );
    console.log("Updated post:", updatedPost);
    // res.json({ message: "Post updated successfully", post: updatedPost });
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating post" });
  }
});

module.exports = router;
// Delete Route: Delete post from the database
router.post("/posts/:id/delete", isLoggedIn, async (req, res) => {
  try {
    console.log("deleting post " + req.params.id);
    await postModel.findByIdAndDelete(req.params.id);
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting post");
  }
});

/* 
 Middlewares 
 */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    console.log("logged in");
    return next();
  }
  console.log("  res.redirect( / );");
  res.redirect("/");
}

module.exports = router;
