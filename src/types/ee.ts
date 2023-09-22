import { ProductType } from "./producttypes";

export type ScrapedProduct = {
    price: number,
    url: string,
    title: string,
    images: string[],
    description: Object[],
    site: ScrapedProductSite,
    product_type: ProductType,
}

export enum ScrapedProductSite {
    SHEIN = "shein",
}