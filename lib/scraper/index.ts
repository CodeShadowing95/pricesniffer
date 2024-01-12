import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractDescription2, extractPrice } from "../utils";

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

        const cPrice = $('.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay').text().trim().split('€')[0] ||
            $('.a-price.a-text-price.apexPriceToPay .a-offscreen').text().trim().split('€')[0];
        const currentPrice = cPrice.split(',')[0].replace(/[^\d]/g, "");

        const oPrice = $('.aok-relative .basisPrice .a-text-price .a-offscreen').text() === '' ? 
            '' : $('.aok-relative .basisPrice .a-text-price .a-offscreen').text().trim().split('€')[0] ||
            $('table.a-lineitem .a-span12 .a-price.a-text-price.a-size-base .a-offscreen').text().trim().split('€')[0];
        const originalPrice = oPrice.split(',')[0].replace(/[^\d]/g, "");

        const dpCurrentPrice = cPrice !== '' ? Number(cPrice.split(',')[1]) : Number(oPrice.split(',')[1]);

        const dpOriginalPrice = oPrice !== '' ? Number(oPrice.split(',')[1]) : Number(cPrice.split(',')[1]);

        const outOfStock = $('#availability span').text().trim().toLowerCase() === 'currently unavailable';

        const images = $('#imgBlkFront').attr('data-a-dynamic-image') || $('#landingImage').attr('data-a-dynamic-image') || '{}';
        const imageURLs = Object.keys(JSON.parse(images));

        const currency = extractCurrency($('.a-price-symbol'));

        const discountRate = $('.savingsPercentage').text().split('%')[0].trim().replace(/[^\d]/g, "");

        const starsCount = $('span.a-declarative a.a-declarative .a-size-base.a-color-base').text().trim().split(' ')[0];

        
        const mainDescription = $('#productDescription_expander span').text().trim();
        const description = extractDescription2($) || extractDescription($);
        
        const reviewsCount = $('#acrCustomerReviewLink #acrCustomerReviewText').text().trim().split(' ')[0].replace(/[^\d]/g, "");        

        const comments = $('tr.a-histogram-row').children().prevObject?.first().text().trim().split(' ')[1].replace(/[^\d]/g, "");
        // const comments = $('tr.a-histogram-row. td.a-text-right:first').text().replace(/[^\d]/g, "");

        // console.log({title, currentPrice, originalPrice, outOfStock, imageURLs, currency, discountRate});
        const data = {
            url,
            currency: currency || '$',
            image: imageURLs[0],
            title,
            currentPrice: currentPrice || originalPrice ? (Number(currentPrice) || Number(originalPrice)) : 0,
            dpCurrentPrice: currentPrice ? Number(dpCurrentPrice) : 0,
            originalPrice: currentPrice || originalPrice ? (Number(originalPrice) || Number(currentPrice)) : 0,
            dpOriginalPrice: originalPrice ? Number(dpOriginalPrice) : 0,
            priceHistory: [],
            discountRate: Number(discountRate),
            category: 'category',
            reviewsCount: Number(reviewsCount),
            starsCount: starsCount,
            isOutOfStock: outOfStock,
            description: mainDescription ? mainDescription : description,
            lowestPrice: Number(currentPrice) || Number(originalPrice),
            highestPrice: Number(originalPrice) || Number(currentPrice),
            averagePrice: Number(originalPrice) || Number(currentPrice),
            comments: Number(comments)
        }

        // console.log(data);

        return data;
    } catch (error: any) {
        throw new Error(`Failed to scrape product: ${error.message}`);
    }
}