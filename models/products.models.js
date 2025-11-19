const mongoose= require("mongoose");

const productsSchema= new mongoose.Schema({
    productType:{
        type: String,
        required: true,
    },
    imageUrl:{
        type: String,
        required: true,
    },
    title:{
        type: String,
        required: true,
    },
    details:{
        type: String,
        required: true,
    },
    gender:{
        type: String,
        required: true,
    },
    age:{
        type: String,
    },
    addedToCart:{
        type: Boolean,
        required: true,
    },
    price:{
        type: Number,
        required: true,
    },
    discount:{
        type: Number,
        required: true,
    },
    size:[{
        type: String,
        enum: ["xs","s","m","l","xl","xxl", "xxxl", "xxxxl"],
        required: true,
    }],
    quantity:{
        type: Number,
        min: 0,
        max: 5,
        default: 0,
    },
    rating:{
        type: Number,
        min: 0,
        max: 5,
        default: 0,
    },
    addedToWishList:{
        type: Boolean,
        required: true,
    },
},
{
    timestamps: true,
},
);

const Products= mongoose.model("Products", productsSchema);

module.exports= Products;

