import { SupabaseClient, createClient } from "@supabase/supabase-js"
import { ScrapedProduct } from "../types/ee";
import { Option } from "../types/option";

export class DAO {
    static supabase: SupabaseClient;
    
    static init() {
        this.supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    }
    
    /**
     * Adds a new product to the database
     * @param product The products info
     */
    static async storeProduct(
        product: ScrapedProduct
    ): Promise<void> {
        if(!this.supabase) this.init()

        const farfetchId = parseInt(product.url.split("-")[product.url.split("-").length - 1].replace(".aspx",""))
        const alreadyExists = await this.getProductByFarfetchId(farfetchId)
        if(alreadyExists.hasValue()) {
            console.log("Product already stored in db")
            return
        } else {
            console.log("Storing product in db...")
        }

        const { data, error } = await this.supabase.from("staging-scraped-products").insert(product)
        
        if(error) {
            console.log("An error occured while adding product")
            console.log(error)
        }
    }

    /**
     * Gets a product from the db by its farfetch id
     * @param id The products farfetch id
     * @returns An Option containing the products data if it exists
     */
    static async getProductByFarfetchId(
        id: number
    ): Promise<Option<ScrapedProduct>> {
        if(!this.supabase) this.init()
        
        const { data, error } = await this.supabase.from("staging-scraped-products").select("*").like("url", `%${id}%`)

        if(data) {
            return new Option<ScrapedProduct>(data[0])
        } else {
            return new Option<ScrapedProduct>()
        }
    }
}