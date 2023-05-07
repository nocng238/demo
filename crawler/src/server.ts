import express, { Express, Request, Response } from 'express';
import fs from 'fs';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { MOUSER_URL } from './MouserURL';
const app: Express = express();
const port = 8000;
const priceQuantityList = [1, 10, 100, 1000, 10000];
app.use(cors());
app.get('/', async (req: Request, res: Response) => {
  try {
    //Molex 733910060
    const query = req.query.search as string;
    console.log(query);
    //PIS150H-471M
    const data = await getPartInfo(query?.trim() || 'PIS150H-471M');
    res.status(200).json(data);
    //   res.statusCode(200).send(data);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
app.get('/mouser', async (req: Request, res: Response) => {
  const data = await getMouserPartInfo();

  res.status(200).json(data);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

const getMouserPartInfo = async () => {
  const url3 =
    'https://www.mouser.com/ProductDetail/Anderson-Power-Products/PS1T24-7X?qs=tub3WQyKOl84j5Li7EeCmw%3D%3D';
  const url4 =
    'https://www.mouser.com/ProductDetail/Anderson-Power-Products/996G1?qs=yoCgdRjoRtHoIhHdbwYFHA%3D%3D';
  const url2 =
    'https://www.mouser.com/ProductDetail/Molex/214756-1022?qs=sGAEpiMZZMsAepjoiJLcxrnVSsNkGrMaPwM3VPW%2F0Ic%2FO46BGx2zVQ%3D%3D';
  const urls = [url4, url2];

  const dataBase = fs.readFileSync('data.json', 'utf-8');
  const dataBaseToJson = JSON.parse(dataBase || '');
  // Open a new page
  await Promise.all(
    MOUSER_URL.map(async (url) => {
      const browser = await puppeteer.launch({
        // args: ["--proxy-server=27.70.167.104:10001"],
        headless: false,
        defaultViewport: null,
      });
      const page = await browser.newPage();

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
      });
      const manufacturerPartNumber = (await page.evaluate(() => {
        return document
          .querySelector('#spnManufacturerPartNumber')
          ?.textContent?.trim();
      })) as string;
      // if (!manufacturerPartNumber) continue;
      console.log(manufacturerPartNumber);
      const stock = await page.evaluate(() => {
        const stockDiv = document.querySelector('#pdpPricingAvailability h2');
        return stockDiv?.textContent
          ?.trim()
          .replace(/\n/g, '')
          .replace('In Stock: ', '');
      });
      const data = await page.evaluate(() => {
        const tds = Array.from(document.querySelectorAll('.pricing-table td'));
        return tds.map((td) => td.textContent?.trim().replace(/\n/g, ''));
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
            (e: any) => e.suplierName === 'Mouser'
          )
        ) {
          dataBaseToJson[manufacturerPartNumber].push({
            suplierName: 'Mouser',
            stock,
            prices: priceList,
            pricingTiers: actualData,
          });
        }
      }
      await browser.close();
    })
  );

  fs.writeFileSync(
    'data.json',
    JSON.stringify({
      ...dataBaseToJson,
    }),
    'utf8'
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
    const breakQty =
      parseFloat(extendedPrice.replace('$', '').replace(',', '')) /
      parseFloat(unitPrice.replace('$', ''));
    actualData.push({
      breakQty: `${breakQty}`,
      unitPrice,
      extendedPrice,
    });
  }
  return actualData;
};

const getPartInfo = async (manufacturePartNumber: string) => {
  const dataBase = fs.readFileSync('data.json', 'utf-8');
  const dataBaseToJson = JSON.parse(dataBase || '');
  const map = new Map(Object.entries(dataBaseToJson));
  if (map.has(manufacturePartNumber.toUpperCase())) {
    return map.get(manufacturePartNumber.toUpperCase());
  }
  // console.log(JSON.parse(dataBase));
  //   return;
  const browser = await puppeteer.launch({
    // args: ["--proxy-server=27.70.167.104:10001"],
    headless: false,
    defaultViewport: null,
  });

  // Open a new page
  const page = await browser.newPage();
  await page.goto('https://www.digikey.com/', {
    waitUntil: 'domcontentloaded',
  });
  const searchInputEl = await page.$('.searchbox-inner-searchtext input');
  await searchInputEl?.type(manufacturePartNumber);
  await searchInputEl?.press('Enter');
  await page.waitForSelector('#__next');

  const a = await page.$('#__NEXT_DATA__');
  const data = JSON.parse(
    (await (await a?.getProperty('textContent'))?.jsonValue()) || ''
  );
  const prices = data.props.pageProps.envelope.data.priceQuantity.pricing.map(
    (price: { pricingTiers: any }) => price.pricingTiers
  ) as Array<any>;
  await browser.close();
  const prices2 = [].concat(...prices) as Array<any>;
  prices2.sort(
    (a, b) =>
      parseInt(a.breakQty.replaceAll(',', ''), 10) -
      parseInt(b.breakQty.replaceAll(',', ''), 10)
  );
  //   console.log(prices2);
  const priceList = priceQuantityList.map((quantity) => {
    return processRawData(prices2, quantity);
  });
  const result = {
    suplierName: 'DigitKey',
    stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
    prices: priceList,
    pricingTiers: prices2,
  };
  fs.writeFileSync(
    'data.json',
    JSON.stringify({
      ...dataBaseToJson,
      [manufacturePartNumber.toUpperCase()]: [result],
    }),
    'utf8'
  );

  console.log('JSON file has been saved.');

  //   console.log(priceList);
  return [
    {
      suplierName: 'DigitKey',
      stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
      prices: priceList,
    },
  ];
};

const processRawData = (rawData: any[], quantity: number) => {
  for (let index = 0; index < rawData.length - 1; index++) {
    const breakQty = parseInt(rawData[index].breakQty.replaceAll(',', ''), 10);
    if (breakQty === quantity) return rawData[index].unitPrice;
    if (
      parseInt(rawData[index].breakQty.replaceAll(',', ''), 10) < quantity &&
      parseInt(rawData[index + 1].breakQty.replaceAll(',', ''), 10) > quantity
    )
      return rawData[index].unitPrice;
  }
  return rawData[rawData.length - 1].unitPrice;
};
