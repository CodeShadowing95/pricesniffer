import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice } from "../utils";

export async function scrapeAmazonProduct(url: string) {
    if(!url) return;

    // curl --proxy brd.superproxy.io:22225 --proxy-user brd-customer-hl_8d2a81d8-zone-pricesniffer:ji0zebxbccy3 -k https://lumtest.com/myip.json

    // Brightdata configuration
    const username = String(process.env.BRIGHT_DATA_USERNAME);
    const password = String(process.env.BRIGHT_DATA_PASSWORD);
    const port = 22225;
    const session_id = (1000000 * Math.random()) | 0;

    const options = {
        auth: {
            username: `${username}-session-${session_id}`,
            password,
        },
        host: 'brd.superproxy.io',
        port,
        rejectUnauthorized: false,
    }

    try {
        // fetch product page
        const response = await axios.get(url, options);
        /* `const $ = cheerio.load(response.data);` is loading the HTML content of the product page
        into the Cheerio library. Cheerio is a fast and flexible library for parsing and
        manipulating HTML, similar to jQuery. By loading the HTML content into Cheerio, we can use
        its methods to easily extract specific elements or data from the page. In this case, it is
        used to extract the product title from the `#productTitle` element on the page. */
        const $ = cheerio.load(response.data);

        // extract the product title
        const title = $('#productTitle').text().trim();
        const currentPrice = extractPrice(
            $('.priceToPay span.a-price-whole'),
            $('.a.size.base.a-color-price'),
            $('.a-button-selected .a-color-base'),
        );

        // const originalPrice = extractPrice(
        //     $('#priceblock_ourprice'),
        //     $('.a-price.a-text-price span.a-offscreen'),
        //     $('#listPrice'),
        //     $('#priceblock_dealprice'),
        //     $('.a-size-base.a-color-price')
        // );

        const normalPrice = $('.aok-relative .basisPrice .a-text-price .a-offscreen').text().replace(/[^\d,]/g, "");
        const originalPrice = normalPrice.replace(/[,]/, ".");

        const outOfStock = $('#availability span').text().trim().toLowerCase() === 'currently unavailable';

        const images = $('#imgBlkFront').attr('data-a-dynamic-image') || $('#landingImage').attr('data-a-dynamic-image') || '{}';
        const imageURLs = Object.keys(JSON.parse(images));

        const currency = extractCurrency($('.a-price-symbol'));

        const discountRate = $('.savingsPercentage').text().replace(/[^\d]/g, "");

        const stars = $('a.a-declarative .a-size-base.a-color-base').text().trim();

        const reviewsCount = $('#acrCustomerReviewLink #acrCustomerReviewText').text().replace(/[^\d]/g, "");

        const description = extractDescription($);

        // console.log({title, currentPrice, originalPrice, outOfStock, imageURLs, currency, discountRate});
        const data = {
            url,
            currency: currency || '$',
            image: imageURLs[0],
            title,
            currentPrice: Number(currentPrice) || Number(originalPrice),
            originalPrice: Number(originalPrice) || Number(currentPrice),
            priceHistory: [],
            discountRate: Number(discountRate),
            category: 'category',
            reviewsCount: Number(reviewsCount),
            stars: stars,
            isOutOfStock: outOfStock,
            description,
            lowestPrice: Number(currentPrice) || Number(originalPrice),
            highestPrice: Number(originalPrice) || Number(currentPrice),
            averagePrice: Number(originalPrice) || Number(currentPrice),
        }

        return data;
    } catch (error: any) {
        throw new Error(`Failed to scrape product: ${error.message}`);
    }
}