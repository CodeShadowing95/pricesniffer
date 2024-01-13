"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";
import Product from "../models/product";
import { scrapeAmazonProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { User } from "@/types";
import { generateEmailBody, sendEmail } from "../nodemailer";

export async function scrapeAndStoreProduct(productUrl:string) {
    if(!productUrl) return;

    try {
        connectToDB();

        const scrapedProduct = await scrapeAmazonProduct(productUrl);

        if(!scrapedProduct) return;

        let product = scrapedProduct;
        // console.log("Product: ", product);

        const existingProduct = await Product.findOne({ url: scrapedProduct.url });

        if(existingProduct) {
            /* The code is creating a new array called `updatedPriceHistory` by combining the existing
            price history of a product (`existingProduct.priceHistory`) with a new price object. */
            const updatedPriceHistory: any = [
                ...existingProduct.priceHistory,
                { price: scrapedProduct.currentPrice }
            ]

            product = {
                ...scrapedProduct,
                priceHistory: updatedPriceHistory,
                lowestPrice: getLowestPrice(updatedPriceHistory),
                highestPrice: getHighestPrice(updatedPriceHistory),
                averagePrice: getAveragePrice(updatedPriceHistory),
            }
        }

        /* The code is using the `findOneAndUpdate` method from the Mongoose library to find a product
        in the database based on its URL (`scrapedProduct.url`). If the product is found, it will
        update the product with the new data (`product`). If the product is not found, it will
        create a new product with the data provided. */
        const newProduct = await Product.findOneAndUpdate(
            {
                url: scrapedProduct.url,
            },
            product,
            { upsert: true, new: true }
        );

        /* The `revalidatePath(`/products/${newProduct._id}`)` function is used to trigger a
        revalidation of the specified path in the Next.js cache. In this case, it is revalidating
        the path `/products/${newProduct._id}`. */
        revalidatePath(`/products/${newProduct._id}`);
    } catch (error: any) {
        throw new Error(`Failed to create/update product: ${error.message}`);
    }
}

export async function getProductById(productId: string) {
    try {
        connectToDB();

        const product = await Product.findOne({ _id: productId });

        if(!product) return null;

        return product;
    } catch (error) {
        console.log(error);
        
    }
}

export async function getAllProducts() {
    try {
        connectToDB();

        const products = await Product.find();

        return products;
    } catch (error) {
        console.log(error);
    }
}

export async function getSimilarProducts(productId: string) {
    try {
        connectToDB();

        const currentProduct = await Product.findById(productId);

        if(!currentProduct) return null;

        /* The code is using the Mongoose library to find similar products to the current product based
        on the provided `productId`. */
        const similarProducts = await Product.find({
            _id: { $ne: productId },
        }).limit(3);

        return similarProducts;
    } catch (error) {
        console.log(error);
    }
}

export async function addUserEmailToProduct(productId: string, userEmail: string) {
    try {
        const product = await Product.findById(productId);

        if(!product) return;

        const userExists = product.users.some((user: User) => user.email === userEmail);

        if(!userExists) {
            product.users.push({ email: userEmail });

            await product.save();

            const emailContent = await generateEmailBody(product, "WELCOME");

            await sendEmail(emailContent, [userEmail]);
        }
    } catch (error) {
        console.log(error);
    }
}