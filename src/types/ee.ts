import { ProductType } from "./producttypes";

export type ScrapedProduct = {
    price: number,
    url: string,
    title: string,
    image: string,
    description: string,
    site: ScrapedProductSite,
    product_type: ProductType,
}

export enum ScrapedProductSite {
    SHEIN = "shein",
}