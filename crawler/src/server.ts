import express, { Express, Request, Response } from "express";
import fs from "fs";
import cors from "cors";
import puppeteer from "puppeteer";
import { stringify } from "querystring";
const app: Express = express();
const port = 8000;
app.use(cors());
app.get("/", async (req: Request, res: Response) => {
  //Molex 733910060
  const query = req.query.search as string;
  console.log(query);
  //PIS150H-471M
  const data = await getPartInfo(query || "PIS150H-471M");
  res.status(200).json(data);
  //   res.statusCode(200).send(data);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

const getPartInfo = async (partId: string) => {
  const dataBase = fs.readFileSync("data.json", "utf-8");
  const dataBaseToJson = JSON.parse(dataBase || "");
  const map = new Map(Object.entries(dataBaseToJson));
  if (map.has(partId.toUpperCase())) {
    return [map.get(partId.toUpperCase())];
  }
  console.log(JSON.parse(dataBase));
  //   return;
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
  await searchInputEl?.type(partId);
  await searchInputEl?.press("Enter");
  await page.waitForSelector("#__next");

  const a = await page.$("#__NEXT_DATA__");
  const data = JSON.parse(
    (await (await a?.getProperty("textContent"))?.jsonValue()) || ""
  );
  const prices = data.props.pageProps.envelope.data.priceQuantity.pricing.map(
    (price: { pricingTiers: any }) => price.pricingTiers
  ) as Array<any>;
  //   console.log(t.props.pageProps);
  await browser.close();
  const prices2 = [].concat(...prices) as Array<any>;
  prices2.sort(
    (a, b) =>
      parseInt(a.breakQty.replaceAll(",", ""), 10) -
      parseInt(b.breakQty.replaceAll(",", ""), 10)
  );
  //   console.log(prices2);
  const priceQuantityList = [1, 10, 100, 1000, 10000];
  const priceList = priceQuantityList.map((quantity) => {
    for (let index = 0; index < prices2.length - 1; index++) {
      const breakQty = parseInt(
        prices2[index].breakQty.replaceAll(",", ""),
        10
      );
      if (breakQty === quantity) return prices2[index].unitPrice;
      if (
        parseInt(prices2[index].breakQty.replaceAll(",", ""), 10) < quantity &&
        parseInt(prices2[index + 1].breakQty.replaceAll(",", ""), 10) > quantity
      )
        return prices2[index].unitPrice;
    }
    return prices2[prices2.length - 1].unitPrice;
  });
  const result = {
    suplierName: "DigitKey",
    stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
    prices: priceList,
    pricingTiers: prices2,
  };
  fs.writeFileSync(
    "data.json",
    JSON.stringify({ ...dataBaseToJson, [partId.toUpperCase()]: result }),
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
