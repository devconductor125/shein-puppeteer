require("dotenv").config()
import puppeteer from 'puppeteer';
import { ScrapedProduct, ScrapedProductSite } from "./types/ee"
import { ProductType } from "./types/producttypes"
import jsdom from "jsdom"
const { JSDOM } = jsdom

async function scrapePage(url: string, pagenum: number) {
  const startTime  = new Date().getTime();

  const browser = await puppeteer.launch({headless: 'new', executablePath: `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`})
  const page = await browser.newPage()
  let pageSlug = "?page="+pagenum;

  await page.goto(url+pageSlug, {
    waitUntil: "load",
    timeout: 0,
  });
  await page.setViewport({width: 1080, height: 1024})

  console.log("Scraping product data...for ", pagenum, "th page");

  await page.waitForSelector("section[roll='main']", { timeout: 120000 });

  const data = await page.content()
  const dom = new JSDOM(data)
  const document = dom.window.document

  // const wholePage = document.querySelector("section[roll='main']");
  // const searchResult = wholePage.querySelector('.product-list');
  const itemList  = document.querySelector('.product-list')

  if(!itemList) throw new Error("No items found")

  const items = itemList.children

  for(let item of items) {
      await scrapeItem(item, ProductType.SHOE);
  }

  await page.close()
  await browser.close()
  
  const endTime  = new Date().getTime();
  console.log("Page Time: ", (endTime - startTime)/1000)

  let newPageNum = pagenum+1;
  return newPageNum;
}


// ---------------------------------  Scrapping item -------------------------------------------------------

async function scrapeItem(item: Element, productType: ProductType) {
  const startTime  = new Date().getTime();

  // get product page link
  const itemLink = item.querySelector("div.S-product-item__name");
  const itemPageLink = "https://us.shein.com" + itemLink.querySelector('a').getAttribute("href");

  console.log("Item link: ",itemPageLink)

  // Open new page
  const browser = await puppeteer.launch({headless: 'new', executablePath: `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`})
  const page = await browser.newPage()
  await page.goto(itemPageLink, {
    waitUntil: "load",
    timeout: 0,
  });
  await page.setViewport({width: 1080, height: 1024})
  
  page.waitForSelector(".product-intro");

  const data = await page.content()
  const dom = new JSDOM(data)
  const document = dom.window.document

  const mainContent = document.querySelector('.product-intro');

  const title = mainContent.querySelector(".product-intro__head-name")?.textContent
  const url = itemPageLink

  const price = mainContent.querySelector('.product-intro__head-mainprice').querySelector(".discount")?.textContent?.replace("$","")?.replace(",","");

  const detailTable = document.querySelector('.product-intro__description-table');

  const detailList = detailTable.children

  const description = []

  for(let detailItem of detailList) {
    const keyName = detailItem.querySelector(".key")?.textContent.replace(":", "").trim();
    const value = detailItem.querySelector(".value")?.innerText;
    const detail = {
      [keyName]: value
    }
    description.push(detail);
  }

  const swiperContent = mainContent.querySelector(".swiper-wrapper");
  const swiperDivs = swiperContent.children

  const images = []

  for (let swiperItem of swiperDivs) {
    const imageLink = swiperItem.querySelector('img.crop-image-container__img')?.getAttribute("src");
    const fullImageLink = "https:"+imageLink;
    console.log("ImageLink : ", fullImageLink)

    images.push(fullImageLink);
  }
  
  if(!title || !url || !price || !images) {
      console.log("Missing data for product")
      return
  }

  const product: ScrapedProduct = {
      title,
      url,
      price: parseFloat(price),
      images,
      description,
      site: ScrapedProductSite.SHEIN,
      product_type: productType
  }

  // await DAO.storeProduct(product)

  await page.close()
  await browser.close()
  console.log("Scrapped product", product);

  const endTime  = new Date().getTime();
  console.log("Item Time: ", (endTime - startTime)/1000)
}

//--------------------------------------------- Get Total Page ---------------------------------------

async function getAllPage(url: string) {
  const startTime  = new Date().getTime();
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`,
  });
  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "load",
    timeout: 0,
  });
  await page.waitForSelector(".sui-pagination__total");

  const data = await page.content()
  const dom = new JSDOM(data)
  const document = dom.window.document

  let totalPage = document.querySelector(".sui-pagination__total");
  await page.close()
  await browser.close()
  const totalNum = totalPage.innerHTML.replace("Total ", "").replace("Pages", '');

  const endTime = new Date().getTime();
  console.log((endTime-startTime)/1000);
  return parseInt(totalNum);


}

async function scrapeProduct(url: string): Promise<void> {
  const totalPage = await getAllPage(url);
  console.log("totalPage number: ", totalPage);
  let currentPage = 1;

  while(totalPage > currentPage) {
      console.log("Accessing next page...")
      currentPage = await scrapePage(url, currentPage)
  }
}

scrapeProduct("https://us.shein.com/Men-Shoes-c-2089.html");
