import Product from "@/lib/models/product";
import { connectToDB } from "@/lib/mongoose";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scraper";
import { getAveragePrice, getEmailNotifType, getHighestPrice, getLowestPrice } from "@/lib/utils";
import { NextResponse } from "next/server";

// Some options provided by Next.js to modify the way our API opens
export const maxDuration = 5;
export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET() {
    try {
        connectToDB();

        const products = await Product.find({});

        if(!products) throw new Error('No products found!');

        /* The code is using `Promise.all` to asynchronously process an array of `products`. It maps
        over each `currentProduct` in the `products` array and performs an asynchronous operation on
        each one. The result of each asynchronous operation is an updated product. */
        const updatedProducts = await Promise.all(
            products.map(async (currentProduct) => {
                // 1. SCRAPE LATEST PRODUCT DETAILS & UPDATE DB
                const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

                if(!scrapedProduct) throw new Error('This specific product not found!');
                
                const updatedPriceHistory: any = [
                    ...currentProduct.priceHistory,
                    { price: scrapedProduct.currentPrice }
                ]

                const product = {
                    ...scrapedProduct,
                    priceHistory: updatedPriceHistory,
                    lowestPrice: getLowestPrice(updatedPriceHistory),
                    highestPrice: getHighestPrice(updatedPriceHistory),
                    averagePrice: getAveragePrice(updatedPriceHistory),
                }

                const updatedProduct = await Product.findOneAndUpdate(
                    { url: product.url },
                    product,
                );


                // 2. CHECK EACH PRODUCT'S STATUS & SEND EMAIL ACCORDINGLY
                const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct);

                if(emailNotifType && updatedProduct.users.length > 0) {
                    const productInfo = {
                        title: updatedProduct.title,
                        url: updatedProduct.url,
                    }

                    const emailContent = await generateEmailBody(productInfo, emailNotifType);

                    const userEmails = updatedProduct.users.map((user: any) => user.email);

                    await sendEmail(emailContent, userEmails);
                }

                return updatedProduct;
            })
        )

        /* The code is returning a JSON response with a message and data. The message is set to 'Ok'
        and the data is set to the updatedProducts array. This response will be sent back to the
        client making the request. */
        return NextResponse.json({
            message: 'Ok',
            data: updatedProducts
        })
    } catch (error) {
        console.log('Failed to get products', error);
    }
}