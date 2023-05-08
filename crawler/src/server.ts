import express, { Express, Request, Response } from "express";
import fs from "fs";
import cors from "cors";
import puppeteer from "puppeteer";
import { MOUSER_URL } from "./MouserURL";
const app: Express = express();
const port = 8000;
const priceQuantityList = [1, 10, 100, 1000, 10000];
app.use(cors());
app.get("/", async (req: Request, res: Response) => {
  try {
    //Molex 733910060
    const query = req.query.search as string;
    if (!query) {
      return res.status(200).json([]);
    }
    //PIS150H-471M
    const data = await getPartInfo(query?.trim() || "PIS150H-471M");
    res.status(200).json(data);
    //   res.statusCode(200).send(data);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
app.get("/mouser", async (req: Request, res: Response) => {
  // const data = await getMouserPartInfo();
  // await getMouser();
  // await getDigiKeyLinks(
  //   "https://www.digikey.com/en/products/filter/circuit-breakers/143"
  // );
  await getDigiKeyPartInfo2();
  res.status(200).json({ message: "what up?" });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

const getMouserLinks = async () => {
  const url =
    "https://www.mouser.com/c/circuit-protection/circuit-breakers-accessories/";
  // const dataBase = fs.readFileSync("data.json", "utf-8");
  // const dataBaseToJson = JSON.parse(dataBase || "");
  const browser = await puppeteer.launch({
    // args: ["--proxy-server=27.70.167.104:10001"],
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "domcontentloaded",
  });
  const links = await page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll(".mfr-part-num a[href]"),
      (a) => a.getAttribute("href")
    );

    return els;
  });
  browser.close();
  return links;
};

export const getMouserPartInfo = async () => {
  const links = (await getMouserLinks()) as string[];
  const dataBase = fs.readFileSync("data.json", "utf-8");
  const dataBaseToJson = JSON.parse(dataBase || "");
  // Open a new page
  for (const url of links) {
    const browser = await puppeteer.launch({
      // args: ["--proxy-server=27.70.167.104:10001"],
      headless: false,
      defaultViewport: null,
    });
    const page = await browser.newPage();
    await page.goto(`https://www.mouser.com${url}`, {
      waitUntil: "domcontentloaded",
    });
    const manufacturerPartNumber = (await page.evaluate(() => {
      return document
        .querySelector("#spnManufacturerPartNumber")
        ?.textContent?.trim();
    })) as string;
    // if (!manufacturerPartNumber) continue;
    console.log(manufacturerPartNumber);
    const mouserPartNum = await page.evaluate(() => {
      const stockDiv = document.querySelector(
        "#spnMouserPartNumFormattedForProdInfo"
      );
      return stockDiv?.textContent
        ?.trim()
        .replace(/\n/g, "")
        .replace("In Stock: ", "");
    });
    const stock = await page.evaluate(() => {
      const stockDiv = document.querySelector("#pdpPricingAvailability h2");
      return stockDiv?.textContent
        ?.trim()
        .replace(/\n/g, "")
        .replace("In Stock: ", "");
    });
    const data = await page.evaluate(() => {
      const tds = Array.from(document.querySelectorAll(".pricing-table td"));
      return tds.map((td) => td.textContent?.trim().replace(/\n/g, ""));
    });
    data.pop();
    data.pop();
    const actualData = processDataMouser(data as string[]);
    const priceList = priceQuantityList.map((quantity) => {
      return processRawData(actualData, quantity);
    });
    if (dataBaseToJson[manufacturerPartNumber]) {
      if (
        dataBaseToJson[manufacturerPartNumber].find(
          (e: any) => e.suplierName === "Mouser"
        )
      ) {
        dataBaseToJson[manufacturerPartNumber].push({
          suplierName: "Mouser",
          sku: mouserPartNum,
          link: `https://www.mouser.com${url}`,
          stock,
          prices: priceList,
          pricingTiers: actualData,
        });
      }
    } else {
      dataBaseToJson[manufacturerPartNumber] = [
        {
          suplierName: "Mouser",
          sku: mouserPartNum,
          link: `https://www.mouser.com${url}`,
          stock,
          prices: priceList,
          pricingTiers: actualData,
        },
      ];
    }
    console.log("data save");
    await browser.close();
    await delay(1000);
  }

  fs.writeFileSync(
    "data.json",
    JSON.stringify({
      ...dataBaseToJson,
    }),
    "utf8"
  );

  // console.log(data);
  // return {
  //   suplierName: 'Mouser',
  //   stock,
  //   prices: priceList,
  //   // pricingTiers: actualData,
  // };
};
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
const processDataMouser = (data: string[]) => {
  const actualData: {
    breakQty: string;
    unitPrice: string;
    extendedPrice: string;
  }[] = [];
  for (let index = 0; index < data.length; index += 2) {
    const unitPrice = data[index];
    const extendedPrice = data[index + 1];
    const breakQty = Math.round(
      parseFloat(extendedPrice.replace("$", "").replace(",", "")) /
        parseFloat(unitPrice.replace("$", ""))
    );
    actualData.push({
      breakQty: `${breakQty}`,
      unitPrice,
      extendedPrice,
    });
  }
  return actualData;
};

const getPartInfo = (manufacturePartNumber: string) => {
  const searchPart = manufacturePartNumber.toUpperCase();
  const dataBase = fs.readFileSync("output.json", "utf-8");
  const dataBaseToJson = JSON.parse(dataBase || "");
  // const map = new Map(Object.entries(dataBaseToJson));
  if (dataBaseToJson[searchPart]) {
    return dataBaseToJson[searchPart];
  }
  return [];
};
export const getDigiKeyLinks = async (url: string) => {
  const browser = await puppeteer.launch({
    // args: ["--proxy-server=27.70.167.104:10001"],
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "domcontentloaded",
  });
  //[data-foo="value"]
  const links = await page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll('[data-testid = "data-table-product-number"]'),
      (a) => a.getAttribute("href")
    );
    //data-testid="data-table-product-image"
    const images = Array.from(
      document.querySelectorAll('[data-testid = "data-table-product-image"]'),
      (a) => a.getAttribute("src")
    );

    return { els, images };
  });
  const result = [];
  for (let index = 0; index < links.images.length; index++) {
    result.push({
      link: `https://www.digikey.com${links.els[index]}`,
      image: `https:${links.images[index]}` as string,
    });
  }
  browser.close();
  // console.log(links.images);
  return result;
};
const getDigiKeyPartInfo2 = async () => {
  const url = "https://www.digikey.com/en/products/filter/circuit-breakers/142";
  const links_data = await getDigiKeyLinks(url);
  const dataBase = fs.readFileSync("output.json", "utf-8");
  const dataBaseToJson = JSON.parse(dataBase || "");
  for (const url of links_data) {
    const browser = await puppeteer.launch({
      // args: ["--proxy-server=27.70.167.104:10001"],
      headless: false,
      defaultViewport: null,
    });
    // Open a new page
    const page = await browser.newPage();
    await page.goto(url.link, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("#__next");
    const a = await page.$("#__NEXT_DATA__");
    const data = JSON.parse(
      (await (await a?.getProperty("textContent"))?.jsonValue()) || ""
    );
    const product_overview = data.props.pageProps.envelope.data.productOverview;
    const prices = data.props.pageProps.envelope.data.priceQuantity.pricing.map(
      (price: { pricingTiers: any; digikeyProductNumber: string }) => {
        return price.pricingTiers;
      }
    ) as Array<any>;
    await browser.close();
    const manufacturerPartNumber = product_overview.manufacturerProductNumber;
    const prices2 = [].concat(...prices) as Array<any>;
    prices2.sort(
      (a, b) =>
        parseInt(a.breakQty.replace(",", ""), 10) -
        parseInt(b.breakQty.replace(",", ""), 10)
    );
    //   console.log(prices2);
    const priceList = priceQuantityList.map((quantity) => {
      return processRawData(prices2, quantity);
    });
    if (dataBaseToJson[manufacturerPartNumber]) {
      if (
        dataBaseToJson[manufacturerPartNumber].find(
          (e: any) => e.suplierName === "DigiKey"
        )
      ) {
        dataBaseToJson[manufacturerPartNumber].push({
          suplierName: "DigiKey",
          stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
          sku: product_overview.rolledUpProductNumber,
          prices: priceList,
          link: url.link,
          image: url.image,
          pricingTiers: prices2,
        });
      }
    } else {
      dataBaseToJson[manufacturerPartNumber] = [
        {
          suplierName: "DigiKey",
          stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
          sku: product_overview.rolledUpProductNumber,
          link: url.link,
          image: url.image,
          prices: priceList,
          pricingTiers: prices2,
        },
      ];
    }
  }
  fs.writeFileSync(
    "output.json",
    JSON.stringify({
      ...dataBaseToJson,
    }),
    "utf8"
  );
};

const getDigiKeyPartInfo1 = async (manufacturePartNumber: string) => {
  const dataBase = fs.readFileSync("data.json", "utf-8");
  const dataBaseToJson = JSON.parse(dataBase || "");

  const browser = await puppeteer.launch({
    // args: ["--proxy-server=27.70.167.104:10001"],
    headless: false,
    defaultViewport: null,
  });
  // Open a new page
  const page = await browser.newPage();
  await page.goto("https://www.digikey.com/", {
    waitUntil: "domcontentloaded",
  });
  const searchInputEl = await page.$(".searchbox-inner-searchtext input");
  await searchInputEl?.type(manufacturePartNumber);
  await searchInputEl?.press("Enter");
  await page.waitForSelector("#__next");

  const a = await page.$("#__NEXT_DATA__");
  const data = JSON.parse(
    (await (await a?.getProperty("textContent"))?.jsonValue()) || ""
  );
  const prices = data.props.pageProps.envelope.data.priceQuantity.pricing.map(
    (price: { pricingTiers: any }) => price.pricingTiers
  ) as Array<any>;
  await browser.close();
  const prices2 = [].concat(...prices) as Array<any>;
  prices2.sort(
    (a, b) =>
      parseInt(a.breakQty.replaceAll(",", ""), 10) -
      parseInt(b.breakQty.replaceAll(",", ""), 10)
  );
  //   console.log(prices2);
  const priceList = priceQuantityList.map((quantity) => {
    return processRawData(prices2, quantity);
  });
  const result = {
    suplierName: "DigiKey",
    stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
    prices: priceList,
    pricingTiers: prices2,
  };
  fs.writeFileSync(
    "data.json",
    JSON.stringify({
      ...dataBaseToJson,
      [manufacturePartNumber.toUpperCase()]: [result],
    }),
    "utf8"
  );

  console.log("JSON file has been saved.");

  //   console.log(priceList);
  return [
    {
      suplierName: "DigitKey",
      stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
      prices: priceList,
    },
  ];
};

const processRawData = (
  rawData: {
    breakQty: string;
    unitPrice: string;
    extendedPrice: string;
  }[],
  quantity: number
) => {
  // console.log(rawData);
  for (let index = 0; index < rawData.length - 1; index++) {
    const breakQty = parseInt(rawData[index].breakQty.replace(",", ""), 10);
    if (breakQty === quantity) return rawData[index].unitPrice;
    if (
      parseInt(rawData[index].breakQty?.replace(",", ""), 10) < quantity &&
      parseInt(rawData[index + 1].breakQty?.replace(",", ""), 10) > quantity
    )
      return rawData[index].unitPrice;
  }
  return rawData[rawData.length - 1].unitPrice;
};
