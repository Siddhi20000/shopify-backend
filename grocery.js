const express= require("express");
const app= express();
const mongoose = require("mongoose");

const {initializeDatabase}= require("./db/db.connect");
const authRoutes = require("./routes/auth.routes");

const Product= require("./models/product.models");
const Cart= require("./models/cart.models");
const Wishlist= require("./models/wishlist.models");
const Order = require("./models/order.models");

const authMiddleware = require("./middlewares/auth.middleware");
const roleMiddleware = require("./middlewares/role.middleware");

//require("dotenv").config();
require("dotenv").config({ path: ".env.grocery" });

app.use(express.json());
app.use("/auth", authRoutes);
initializeDatabase();

const cors= require("cors");
const corsOptions={
    origin: "*",
    credentials: true,
}
app.use(cors(corsOptions));

//only seller/manager can add product
async function createProduct(newProduct){
    try{
        const ProductNew= new Product(newProduct);
        const saveProduct= await ProductNew.save();
        return saveProduct;
    }
    catch(error){
        console.log(error);
    }
}

app.post("/products",authMiddleware, roleMiddleware("manager"), async(req,res)=>{
    try{
        const newProduct= await createProduct({ ...req.body, managerId: req.user.userId });
        res.status(201).json({message: "product added successfully", product: newProduct});
    }
    catch(error){
        res.status(500).json({error: "Failed to add Product"});
    }
})

// updating products by manager/seller
app.put(
  "/products/:productId",
  authMiddleware,
  roleMiddleware("manager"),
  async (req, res) => {
    try {
      const updatedProduct = await Product.findByIdAndUpdate(
        { _id: req.params.productId, managerId: req.user.userId },
        req.body,
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({
        message: "Product updated successfully",
        product: updatedProduct
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  }
);

// delete products api for manager/seller
app.delete(
  "/products/:productId",
  authMiddleware,
  roleMiddleware("manager"),
  async (req, res) => {
    try {
      const deletedProduct = await Product.findByIdAndDelete({ _id: req.params.productId, managerId: req.user.userId });

      if (!deletedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  }
);

//manager sales report api
app.get(
  "/manager/sales-report",
  authMiddleware,
  roleMiddleware("manager"),
  async (req, res) => {
    try {
      const report = await Order.aggregate([
        // break items array
        { $unwind: "$items" },

        // group by productId
        {
          $group: {
            _id: "$items.productId",
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: ["$items.quantity", "$items.price"]
              }
            }
          }
        },

        // join product collection
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product"
          }
        },

        { $unwind: "$product" },

        // filter products by logged-in manager
        { 
          $match: { "product.managerId": new mongoose.Types.ObjectId(req.user.userId) } 
        },

        // final response format
        {
          $project: {
            _id: 0,
            productId: "$product._id",
            name: "$product.name",
            category: "$product.category",
            price: "$product.price",
            totalSold: 1,
            totalRevenue: 1
          }
        }
      ]);

      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

//most sold product filter for manager
app.get(
  "/manager/sales-report/most-sold",
  authMiddleware,
  roleMiddleware("manager"),
  async (req, res) => {
    const report = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    res.json(report);
  }
);


//least sold product filter for manager
app.get(
  "/manager/sales-report/least-sold",
  authMiddleware,
  roleMiddleware("manager"),
  async (req, res) => {
    const report = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: 1 } },
      { $limit: 5 }
    ]);

    res.json(report);
  }
);


//sales report by category
app.get(
  "/manager/sales-report/category/:category",
  authMiddleware,
  roleMiddleware("manager"),
  async (req, res) => {
    const { category } = req.params;

    const report = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      { $match: { "product.category": category } },
      {
        $group: {
          _id: "$product._id",
          name: { $first: "$product.name" },
          totalSold: { $sum: "$items.quantity" }
        }
      }
    ]);

    res.json(report);
  }
);


//get products api
app.get("/products", async(req,res)=>{
    try{
        const products= await Product.find(); //getAllProducts();
        if(products.length!=0){
            res.json(products);
        }
        else{
            res.status(200).json({error: "No products availabel"});
        }
    }
    catch(error){
        res.status(500).json({error: "Failed to add Product"});
    }
});


//get products by category
async function getProductByCategory(category){
    try{
        const productByCategory= await Product.find({category: category});
        return productByCategory;
    }
    catch(error){
        console.log(error);
    }
}

app.get("/products/productByCategory/:category", async(req,res)=>{
    try{
        const products= await getProductByCategory(req.params.category);
        if(products.length!=0){
            res.json(products);
        }
        else{
            res.status(404).json({error: "products not there"});
        }
    }
    catch(error){
        res.status(500).json({error: "no products found"});
    }
});


//get products by productId
app.get("/products/:productId", async(req,res)=>{
    try{
        const products= await Product.findById(req.params.productId)
        if(products){
            res.json(products);
        }
        else{
            return res.status(404).json({error: "product not found"});
        }
    }
    catch(error){
        res.status(500).json({error: "no products found"});
    }
});


//add to cart api for user
app.post("/products/api/cart/:productId", authMiddleware,roleMiddleware("customer"), async (req, res) => {
    try {
      const productId = req.params.productId;

      // 1. Check product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // 2. Check if product already in THIS USER'S cart
      const existingItem = await Cart.findOne({
        userId: req.user.userId,
        productId: productId,
      }).populate("productId");
      
      console.log("Authorization header:", req.headers.authorization);
      console.log("Decoded user:", req.user);


      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.totalPrice =
          existingItem.quantity * existingItem.productId.price;
        await existingItem.save();

        return res.json({ cartItem: existingItem });
      }

      // 3. Add new cart item
      const cartItem = new Cart({
        userId: req.user.userId,
        productId,
        quantity: 1,
        totalPrice: product.price,
      });

      await cartItem.save();
      const populatedCartItem = await cartItem.populate("productId");

      res.status(201).json({
        message: "Product added to cart",
        cartItem: populatedCartItem,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);


//get cart api for user
app.get("/products/api/cart",authMiddleware, roleMiddleware("customer"), async (req, res) => {
    try {
      const cartItems = await Cart.find({
        userId: req.user.userId
      }).populate("productId");

      res.status(200).json(cartItems);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
// If not logged in → 401
// If logged in as manager → 403
// If logged in as customer → only their cart


//update quantity of cart item api for user
app.put("/products/api/cart/update/:productId", authMiddleware, roleMiddleware("customer"), async (req, res) => {
  try {
    const { productId } = req.params;
    const { action } = req.body; // "inc" or "dec"

    const cartItem = await Cart.findOne({
        productId: new mongoose.Types.ObjectId(productId)
    });


    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (action === "inc") {
      cartItem.quantity += 1;
    }

    if (action === "dec") {
      if (cartItem.quantity === 1) {
        await Cart.deleteOne({
          productId: new mongoose.Types.ObjectId(productId),
        });
        return res.json({ removed: true });
      }
      cartItem.quantity -= 1;
    }

    // Populate product to get price
    await cartItem.populate("productId");

    // Calculate total price
    cartItem.totalPrice =
      cartItem.quantity * cartItem.productId.price;

    await cartItem.save();

    //return res.json(cartItem);
    // RE-FETCH populated document

    const updatedCartItem = await Cart.findById(cartItem._id).populate("productId");
    
    return res.json(updatedCartItem);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



//delete from cart api for user
app.delete("/products/api/cart/:id", authMiddleware, roleMiddleware("customer"), async(req,res)=>{
    try{
        const cartItemId= req.params.id;
        const deletedItem = await Cart.findByIdAndDelete(cartItemId);
        
        if (!deletedItem) {
            return res.status(404).json({ error: "Cart item not found" });
        }
        
        res.status(200).json({
            message: "Cart item deleted successfully",
            deletedItem,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});


//add to wishlist api for user
app.post("/products/api/wishlist/addToWishlist/:productId", authMiddleware, roleMiddleware("customer"), async (req, res) => {
  try {
    const { productId } = req.params;

    // check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // check wishlist duplicate
    const exists = await Wishlist.findOne({ productId });
    if (exists) {
      return res.status(200).json({ message: "Already in wishlist" });
    }

    const wishlistItem = new Wishlist({ productId });
    await wishlistItem.save();

    const populated = await wishlistItem.populate("productId");

    res.status(201).json({
      message: "Added to wishlist",
      wishlistItem: populated,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// get wishlist api for user
app.get("/products/api/wishlist", authMiddleware, roleMiddleware("customer"), async (req, res) => {
  try {
    const wishlist =await Wishlist.find().populate("productId");
    res.status(200).json(wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


//remove from wishlist api for user
app.delete("/products/api/wishlist/removeFromWishlist/:id", authMiddleware, roleMiddleware("customer"), async (req, res) => {
  try {
    const { id } = req.params;

    // Delete by wishlist document _id
    const deleted = await Wishlist.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    res.status(200).json({
      message: "Removed from wishlist",
      deletedItem: deleted,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//checkout api for user
app.post(
  "/checkout",
  authMiddleware,
  roleMiddleware("customer"),
  async (req, res) => {
    try {
      const cartItems = await Cart.find({
        userId: req.user.userId,
      }).populate("productId");

      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      let totalAmount = 0;

      const items = cartItems.map(item => {
        totalAmount += item.productId.price * item.quantity;

        return {
          productId: item.productId._id,
          quantity: item.quantity,
          price: item.productId.price,
        };
      });

      const order = new Order({
        userId: req.user.userId,
        items,
        totalAmount,
      });

      await order.save();

      // clear cart after checkout
      await Cart.deleteMany({ userId: req.user.userId });

      res.status(201).json({
        message: "Checkout successful",
        billSummary: order,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);



const PORT= process.env.PORT || 3000;
app.listen(PORT,()=>{
    console.log(`Server is runing on ${PORT}`);
});






