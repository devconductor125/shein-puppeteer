require("dotenv").config()
import puppeteer, { Browser } from 'puppeteer';
import { ScrapedProduct, ScrapedProductSite } from "./types/ee"
import { ProductType } from "./types/producttypes"
import jsdom from "jsdom"
const { JSDOM } = jsdom
import { DAO } from "./lib/dao"

const specifyBrowserPath = true;

let browserOption
  if(specifyBrowserPath) {
    browserOption = {
      headless: "new",
      executablePath: `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`,
      ignoreHTTPSErrors: true,
    }
  } else {
    browserOption = {
      headless: "new",
      ignoreHTTPSErrors: true,
    }
  }

async function scrapePage(url: string, pagenum: number) {

  const browser = await puppeteer.launch(browserOption)
  const page = await browser.newPage()
  let pageSlug = "?page="+pagenum;

  await page.goto(url+pageSlug, {
    waitUntil: "load",
    timeout: 0,
  });
  await page.setViewport({width: 1080, height: 1024})
  console.log("Scraping product data...for ", pagenum, "th page");
  await page.waitForSelector(".product-list");

  const data = await page.content()
  const dom = new JSDOM(data)
  const document = dom.window.document

  const itemList  = document.querySelector('.product-list')

  if(!itemList) throw new Error("No items found")

  const items = itemList.children

  for(let item of items) {
      await scrapeItem(item, ProductType.SHOE, browser);
      await delayMs(1000)
  }

  await page.close()
  await browser.close()
  
  let newPageNum = pagenum+1;
  return newPageNum;
}

// ---------------------------------  Scrapping item -------------------------------------------------------

async function scrapeItem(item: Element, productType: ProductType, browser: Browser) {
  const openedPage = await browser.pages()
  if(openedPage.length <= 0 )browser = await puppeteer.launch(browserOption)

  // get product page link
  const itemLink = item.querySelector("div.S-product-item__name");
  const itemPageLink = "https://us.shein.com" + itemLink.querySelector('a').getAttribute("href").split("?")[0];

  // Open new page
  const page = await browser.newPage()
  await page.goto(itemPageLink, {
    waitUntil: "load",
    timeout: 0,
  });
  await page.setViewport({width: 1080, height: 1024});
  await delayMs(8000)
  
  const data = await page.content()
  const dom = new JSDOM(data)
  const document = dom.window.document


  const mainContent = document.querySelector('.product-intro');

  const title = mainContent.querySelector(".product-intro__head-name")?.textContent
  const url = itemPageLink
  const price = mainContent.querySelector('.product-intro__head-mainprice').querySelector(".discount")?.textContent?.replace("$","")?.replace(",","");
  
  const detailTable = document.querySelector('.product-intro__description-table');
  const detailList = detailTable.children
  let descriptionText = ""
  for(let detailItem of detailList) {
    const keyName = detailItem.querySelector(".key")?.textContent;
    const value = detailItem.querySelector(".val")?.textContent.trim();
    descriptionText += keyName+value+", "
  }

  const thumbnaiList = mainContent.querySelector(".product-intro__thumbs-inner");
  const thumbnails = thumbnaiList.children

  const images = []

  for (let thumbnail of thumbnails) {
    
    const imageLink = await thumbnail.querySelector('img.crop-image-container__img')?.getAttribute("src");
    const fullImageLink = "https:"+imageLink;

    images.push(fullImageLink);
  }

  const swiperContent = mainContent.querySelector(".swiper-wrapper");
  const firstChild = swiperContent.firstElementChild;
  const productImageLink = await firstChild.querySelector('img.crop-image-container__img')?.getAttribute("src");

  const productImage = "https:"+productImageLink;
  
  if(!title || !url || !price || !productImage) {
      console.log("Missing data for product")
      return
  }

  const description = descriptionText.slice(0, -2);

  const product: ScrapedProduct = {
      title,
      url,
      price: parseFloat(price),
      image: productImage,
      description,
      site: ScrapedProductSite.SHEIN,
      product_type: productType
  }

  console.log("Scrapped product", product);

  await DAO.storeProduct(product)
  await delayMs(1000)

  await page.close()
}

//--------------------------------------------- Get Total Page Number ---------------------------------------

async function getAllPage(url: string) {
  const browser = await puppeteer.launch(browserOption);
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

async function delayMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

scrapeProduct("https://us.shein.com/Men-Shoes-c-2089.html");
