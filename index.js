const express= require("express");
const app= express();

const {initializeDatabase}= require("./db/db.connect");
const Product= require("./models/products.models");

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

// async function readAllProducts(){
//     try{
//         const allProducts= await Product.find();
//         return allProducts;
//     }
//     catch(error){
//         console.log(error);
//     }
// }

app.get("/products", async(req,res)=>{
    try{
        const products= await Product.find(); //readAllProducts();
        if(products.length!=0){
            res.json(products);
        }
        else{
            res.status(201).json({error: "No products availabel"});
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
            res.status(202)._construct({error: "products not there"});
        }
    }
    catch(error){
        res.status(500).json({error: "no products found"});
    }
});

app.get("/products/:productId", async(req,res)=>{
    try{
        const products= await Product.findById(req.params.productId)
        if(products.length!=0){
            res.json(products);
        }
        else{
            return res.status(404).json({error: "product not found"});
        }
    }
    catch(error){
        res.status(500).json({error: "no products found"});
    }
})

const PORT= process.env.PORT;
app.listen(PORT,()=>{
    console.log(`Server is runing on ${PORT}`);
});



