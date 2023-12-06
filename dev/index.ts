//Database & routing
import mongoose, { Schema } from "mongoose";
import express, { urlencoded } from "express";
//files
import path from "path";
import fileDirName from "./utils/file-dir-name.js";

//for accessing pw safely:
import "dotenv/config";
import { configDotenv } from "dotenv";
configDotenv({ path: "../.env" });

//mongoose connection string
import connectionString from "./utils/connectionString.js";
await connectionString();
//schema, products and farm data
import {
	groceryProduct,
	groceryProductSchema,
	farm,
	farmSchema,
} from "./models/index.js";
// getBing func
import {
	addBingImg,
	updateAllImgs,
	removeImgs,
	imageReset,
	getBing,
} from "./seed/addBingImage.js";
//custom error
import AppError from "./utils/AppError.js";
//@ts-ignore
import engine from "ejs-mate";

import {
	_503_server_down,
	_404,
	_404_product,
	_404_product_edit,
	_404_cat,
	_404_farm,
	_500_server,
	_400_user,
} from "./errorCodes/index.js";
//express setup
const { __dirname } = fileDirName(import.meta),
	port = process.env.PORT || 8080,
	app = express(); //shortcut for executed express

//default pageName
let pageName = "farmersMarket";
//layout
app.engine("ejs", engine);
//express set up
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
//express ports:
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

//home
app.get("/", async (req, res, next) => {
	try {
		const groceryProductData = await groceryProduct.find();
		res.render("home", { groceryProductData, pageName });
	} catch {
		next(new AppError(500, _503_server_down));
	}
});
//all products view
app.get("/products", async (req, res, next) => {
	try {
		const fruitData = await groceryProduct
				.where("category")
				.equals("fruit").lean(),
			vegetableData = await groceryProduct
				.where("category")
				.equals("vegetable"),
			dairyData = await groceryProduct.where("category").equals("dairy");
		res.render("products/products", {
			fruitData,
			dairyData,
			vegetableData,
			pageName: "Products",
		});
	} catch {
		next(new AppError(500, _500_server));
	}
});
//single product view
app.get("/product/:id", async (req, res, next) => {
	try {
		const { id } = req.params,
			grocerySingleProductData = await groceryProduct.findById(id),
			pageName = `${grocerySingleProductData?.category} | ${grocerySingleProductData?.name}`;
		res.render("products/singleProduct", {
			grocerySingleProductData,
			id,
			pageName,
		});
	} catch {
		next(new AppError(404, _404_product));
	}
});
// get route for new product
app.get("/addProduct", (req, res, next) => {
	try {
		res.render("products/newProduct", { pageName: "New Product" });
	} catch {
		next(new AppError(503, _503_server_down));
	}
});
// post route for new product
app.post("/addProduct", async (req, res, next) => {
	try {
		const {
				name: prodName,
				price: prodPrice,
				qty: prodQty,
				unit: prodUnit,
				category: newCategory,
			} = req.body,
			newProd = new groceryProduct({
				name: prodName,
				price: prodPrice,
				qty: prodQty,
				unit: prodUnit,
				category: newCategory,
			}),
			id = newProd._id;

		await newProd.save();
		res.redirect(`products/product/${id}`);
	} catch {
		next(new AppError(400, _400_user));
	}
});

// category view of products
app.get("/categories/:category", async (req, res, next) => {
	try {
		const { category } = req.params,
			groceryProductData = await groceryProduct.find({
				category: `${category}`,
			});
		res.render("products/perCategory", {
			groceryProductData,
			category,
			pageName: category,
		});
	} catch {
		next(new AppError(404, _404_cat));
	}
});

// searched view of products
app.post("/search", async (req, res, next) => {
	try {
		const { searchBar } = req.body,
			groceryProductData = await groceryProduct.find({
				name: { $in: { searchBar } },
			});
		res.render("products/search", {
			groceryProductData,
			searchBar,
			pageName: `Search: ${searchBar}`,
		});
	} catch {
		next(new AppError(500, _500_server));
	}
});

//deleting and seeding mongo database
app.get("/reset", async (req, res, next) => {
	try {
		await imageReset();
		res.redirect("/products");
	} catch {
		next(new AppError(500, _500_server));
	}
});

//editing product route
app.get("/editProduct/:id", async (req, res, next) => {
	try {
		const { id } = req.params,
			grocerySingleProductData = await groceryProduct.findById(id);

		res.render("products/editProduct", {
			grocerySingleProductData,
			id,
			pageName: `Edit | ${grocerySingleProductData?.name}` || `Edit `,
		});
	} catch {
		next(new AppError(404, _404_product_edit));
	}
});
// posting editing product route
app.post("/editProduct/:id", async (req, res, next) => {
	try {
		const { id } = req.params,
			{ price: prodPrice, qty: prodQty } = req.body;
		if (prodPrice !== "" && prodQty !== "") {
			await groceryProduct
				.updateOne({ _id: id }, { price: prodPrice, qty: prodQty })
				.then((data) => data)
				.catch((err) => err);
		} else if (prodPrice === "" && prodQty !== "") {
			await groceryProduct
				.updateOne(
					{ _id: id },
					{ qty: prodQty },
					{ runValidators: true }
				)
				.then((data) => data)
				.catch((err) => err);
		} else if (prodPrice !== "" && prodQty === "") {
			await groceryProduct
				.updateOne(
					{ _id: id },
					{ price: prodPrice },
					{ runValidators: true }
				)
				.then((data) => data)
				.catch((err) => err);
		}
		res.redirect(`/product/${id}`);
	} catch {
		next(new AppError(400, _400_user));
	}
});

// Unknown pages error route
app.get("*", (req, res, next) => {
	next(new AppError(404, _404));
});
