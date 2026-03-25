const express= require("express");
const app= express();
const mongoose = require("mongoose");
//"start": "nodemon index.js"

const {initializeDatabase}= require("./db/db.connect");
const Product= require("./models/products.models");
const Cart= require("./models/cart.models");
const Wishlist= require("./models/wishlist.models");

app.use(express.json());
initializeDatabase();

const cors= require("cors");
const corsOptions={
    origin: "*",
    credentials: true,
}
app.use(cors(corsOptions));

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

app.post("/products", async(req,res)=>{
    try{
        const newProduct= await createProduct(req.body);
        res.status(201).json({message: "product added successfully", product: newProduct});
    }
    catch(error){
        res.status(500).json({error: "Failed to add Product"});
    }
})

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

async function getProductByGender(gender){
    try{
        const productByGender= await Product.find({gender: gender});
        return productByGender;
    }
    catch(error){
        console.log(error);
    }
}

app.get("/products/productByGender/:gender", async(req,res)=>{
    try{
        const products= await getProductByGender(req.params.gender);
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


//add to cart api
app.post("/products/api/cart/:productId", async(req,res)=>{
    try{
        const productId = req.params.productId;
        const { quantity } = req.body;
        
        //1. Check product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // 2. Add to cart
        // const cartItem = new Cart({
        //     productId: productId,
        //     quantity: quantity || 1,
        // });

        const existingItem = await Cart.findOne({
            productId: new mongoose.Types.ObjectId(productId),
        });
        
        if (existingItem) {
            existingItem.quantity += 1;
            await existingItem.save();
            const populated = await existingItem.populate("productId");
            return res.status(200).json(populated); // res.json({ cartItem: populated });
        }

        const cartItem = new Cart({
            productId,
            quantity: 1,
            totalPrice: product.price,
        });

        await cartItem.save();
        
        // res.status(201).json({
        //     message: "Product added to cart",
        //     cartItem,
        // });

        // Populate productId fields
        const populatedCartItem = await cartItem.populate("productId");
        
        // res.status(201).json({
        //     message: "Product added to cart",
        //     cartItem: populatedCartItem,
        // });

        return res.status(201).json(populatedCartItem);
    
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//get cart api
app.get("/products/api/cart", async (req, res) => {
  try {
    const allProducts = await Cart.find().populate("productId");
    res.status(200).json(allProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//update quantity api
app.put("/products/api/cart/update/:productId", async (req, res) => {
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



//delete from cart api
app.delete("/products/api/cart/:id", async(req,res)=>{
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


//add to wishlist
// app.post("/products/api/wishlist/addToWishlist/:productId", async (req, res) => {
//   try {
//     const { productId } = req.params;

      // check product exists
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({ error: "Product not found" });
//     }

      // check wishlist duplicate
//     const exists = await Wishlist.findOne({ productId });
//     if (exists) {
//       return res.status(200).json({ message: "Already in wishlist" });
//     }

//     const wishlistItem = new Wishlist({ productId });
//     await wishlistItem.save();

//     const populated = await wishlistItem.populate("productId");

//     res.status(201).json({
//       message: "Added to wishlist",
//       wishlistItem: populated,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

app.post("/products/api/wishlist/addToWishlist/:productId", async (req, res) => {
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



// get wishlist
app.get("/products/api/wishlist", async (req, res) => {
  try {
    const wishlist =await Wishlist.find().populate("productId");  //"products"
    res.status(200).json(wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


//remove from wishlist
app.delete("/products/api/wishlist/removeFromWishlist/:id", async (req, res) => {
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



const PORT= process.env.PORT || 3000;
app.listen(PORT,()=>{
    console.log(`Server is runing on ${PORT}`);
});





