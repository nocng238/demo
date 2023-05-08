"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDigiKeyLinks = exports.getMouserPartInfo = void 0;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const app = (0, express_1.default)();
const port = 8000;
const priceQuantityList = [1, 10, 100, 1000, 10000];
app.use((0, cors_1.default)());
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //Molex 733910060
        const query = req.query.search;
        if (!query) {
            return res.status(200).json([]);
        }
        //PIS150H-471M
        const data = yield getPartInfo((query === null || query === void 0 ? void 0 : query.trim()) || "PIS150H-471M");
        res.status(200).json(data);
        //   res.statusCode(200).send(data);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}));
app.get("/mouser", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // const data = await getMouserPartInfo();
    // await getMouser();
    // await getDigiKeyLinks(
    //   "https://www.digikey.com/en/products/filter/circuit-breakers/143"
    // );
    yield getDigiKeyPartInfo2();
    res.status(200).json({ message: "what up?" });
}));
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
const getMouserLinks = () => __awaiter(void 0, void 0, void 0, function* () {
    const url = "https://www.mouser.vn/c/circuit-protection/circuit-breakers-accessories/circuit-breakers/?q=W28-XQ1A";
    // "https://www.mouser.com/c/circuit-protection/circuit-breakers-accessories/";
    // const dataBase = fs.readFileSync("data.json", "utf-8");
    // const dataBaseToJson = JSON.parse(dataBase || "");
    const browser = yield puppeteer_1.default.launch({
        // args: ["--proxy-server=27.70.167.104:10001"],
        headless: false,
        defaultViewport: null,
    });
    const page = yield browser.newPage();
    yield page.goto(url, {
        waitUntil: "domcontentloaded",
    });
    const links = yield page.evaluate(() => {
        const els = Array.from(document.querySelectorAll(".mfr-part-num a[href]"), (a) => a.getAttribute("href"));
        return els;
    });
    browser.close();
    return links;
});
const getMouserPartInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    const links = (yield getMouserLinks());
    const dataBase = fs_1.default.readFileSync("output.json", "utf-8");
    const dataBaseToJson = JSON.parse(dataBase || "");
    // Open a new page
    for (const url of links) {
        const browser = yield puppeteer_1.default.launch({
            // args: ["--proxy-server=27.70.167.104:10001"],
            headless: false,
            defaultViewport: null,
        });
        const page = yield browser.newPage();
        yield page.goto(`https://www.mouser.com${url}`, {
            waitUntil: "domcontentloaded",
        });
        const image = yield page.evaluate(() => {
            var _a;
            return (_a = document.querySelector("#defaultImg")) === null || _a === void 0 ? void 0 : _a.getAttribute("src");
        });
        const manufacturerPartNumber = (yield page.evaluate(() => {
            var _a, _b;
            return (_b = (_a = document
                .querySelector("#spnManufacturerPartNumber")) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim();
        }));
        // if (!manufacturerPartNumber) continue;
        console.log(manufacturerPartNumber);
        const mouserPartNum = yield page.evaluate(() => {
            var _a;
            const stockDiv = document.querySelector("#spnMouserPartNumFormattedForProdInfo");
            return (_a = stockDiv === null || stockDiv === void 0 ? void 0 : stockDiv.textContent) === null || _a === void 0 ? void 0 : _a.trim().replace(/\n/g, "").replace("In Stock: ", "");
        });
        const stock = yield page.evaluate(() => {
            var _a;
            const stockDiv = document.querySelector("#pdpPricingAvailability h2");
            return (_a = stockDiv === null || stockDiv === void 0 ? void 0 : stockDiv.textContent) === null || _a === void 0 ? void 0 : _a.trim().replace(/\n/g, "").replace("In Stock: ", "");
        });
        const data = yield page.evaluate(() => {
            const tds = Array.from(document.querySelectorAll(".pricing-table td"));
            return tds.map((td) => { var _a; return (_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim().replace(/\n/g, ""); });
        });
        data.pop();
        data.pop();
        const actualData = processDataMouser(data);
        const priceList = priceQuantityList.map((quantity) => {
            return processRawData(actualData, quantity);
        });
        if (dataBaseToJson[manufacturerPartNumber]) {
            if (dataBaseToJson[manufacturerPartNumber].find((e) => e.suplierName === "Mouser")) {
                dataBaseToJson[manufacturerPartNumber].push({
                    suplierName: "Mouser",
                    sku: mouserPartNum,
                    link: `https://www.mouser.com${url}`,
                    image: `https://www.mouser.com${image}`,
                    stock,
                    prices: priceList,
                    pricingTiers: actualData,
                });
            }
        }
        else {
            dataBaseToJson[manufacturerPartNumber] = [
                {
                    suplierName: "Mouser",
                    sku: mouserPartNum,
                    link: `https://www.mouser.com${url}`,
                    image: `https://www.mouser.com${image}`,
                    stock,
                    prices: priceList,
                    pricingTiers: actualData,
                },
            ];
        }
        console.log("data save");
        yield browser.close();
        yield delay(1000);
    }
    fs_1.default.writeFileSync("output.json", JSON.stringify(Object.assign({}, dataBaseToJson)), "utf8");
    // console.log(data);
    // return {
    //   suplierName: 'Mouser',
    //   stock,
    //   prices: priceList,
    //   // pricingTiers: actualData,
    // };
});
exports.getMouserPartInfo = getMouserPartInfo;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const processDataMouser = (data) => {
    const actualData = [];
    for (let index = 0; index < data.length; index += 2) {
        const unitPrice = data[index];
        const extendedPrice = data[index + 1];
        const breakQty = Math.round(parseFloat(extendedPrice.replace("$", "").replace(",", "")) /
            parseFloat(unitPrice.replace("$", "")));
        actualData.push({
            breakQty: `${breakQty}`,
            unitPrice,
            extendedPrice,
        });
    }
    return actualData;
};
const getPartInfo = (manufacturePartNumber) => {
    const searchPart = manufacturePartNumber.toUpperCase();
    const dataBase = fs_1.default.readFileSync("output.json", "utf-8");
    const dataBaseToJson = JSON.parse(dataBase || "");
    // const map = new Map(Object.entries(dataBaseToJson));
    if (dataBaseToJson[searchPart]) {
        return dataBaseToJson[searchPart];
    }
    return [];
};
const getDigiKeyLinks = (url) => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield puppeteer_1.default.launch({
        // args: ["--proxy-server=27.70.167.104:10001"],
        headless: false,
        defaultViewport: null,
    });
    const page = yield browser.newPage();
    yield page.goto(url, {
        waitUntil: "domcontentloaded",
    });
    //[data-foo="value"]
    const links = yield page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[data-testid = "data-table-product-number"]'), (a) => a.getAttribute("href"));
        //data-testid="data-table-product-image"
        const images = Array.from(document.querySelectorAll('[data-testid = "data-table-product-image"]'), (a) => a.getAttribute("src"));
        return { els, images };
    });
    const result = [];
    for (let index = 0; index < links.images.length; index++) {
        result.push({
            link: `https://www.digikey.com${links.els[index]}`,
            image: `https:${links.images[index]}`,
        });
    }
    browser.close();
    // console.log(links.images);
    return result;
});
exports.getDigiKeyLinks = getDigiKeyLinks;
const getDigiKeyPartInfo2 = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // const url = "https://www.digikey.com/en/products/filter/circuit-breakers/142";
    const url = "https://www.digikey.com/en/products/filter/circuit-breakers/143?s=N4IgTCBcDaIOpgBwFoAaBFAjAQRAXQBoQBWKUABykyPMsjGIF9Gg";
    const links_data = yield (0, exports.getDigiKeyLinks)(url);
    const dataBase = fs_1.default.readFileSync("output.json", "utf-8");
    const dataBaseToJson = JSON.parse(dataBase || "");
    for (const url of links_data) {
        const browser = yield puppeteer_1.default.launch({
            // args: ["--proxy-server=27.70.167.104:10001"],
            headless: false,
            defaultViewport: null,
        });
        // Open a new page
        const page = yield browser.newPage();
        yield page.goto(url.link, {
            waitUntil: "domcontentloaded",
        });
        yield page.waitForSelector("#__next");
        const a = yield page.$("#__NEXT_DATA__");
        const data = JSON.parse((yield ((_a = (yield (a === null || a === void 0 ? void 0 : a.getProperty("textContent")))) === null || _a === void 0 ? void 0 : _a.jsonValue())) || "");
        const product_overview = data.props.pageProps.envelope.data.productOverview;
        const prices = data.props.pageProps.envelope.data.priceQuantity.pricing.map((price) => {
            return price.pricingTiers;
        });
        yield browser.close();
        const manufacturerPartNumber = product_overview.manufacturerProductNumber;
        const prices2 = [].concat(...prices);
        prices2.sort((a, b) => parseInt(a.breakQty.replace(",", ""), 10) -
            parseInt(b.breakQty.replace(",", ""), 10));
        //   console.log(prices2);
        const priceList = priceQuantityList.map((quantity) => {
            return processRawData(prices2, quantity);
        });
        if (dataBaseToJson[manufacturerPartNumber]) {
            if (dataBaseToJson[manufacturerPartNumber].find((e) => e.suplierName === "DigiKey")) {
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
        }
        else {
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
    fs_1.default.writeFileSync("output.json", JSON.stringify(Object.assign({}, dataBaseToJson)), "utf8");
});
const getDigiKeyPartInfo1 = (manufacturePartNumber) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const dataBase = fs_1.default.readFileSync("data.json", "utf-8");
    const dataBaseToJson = JSON.parse(dataBase || "");
    const browser = yield puppeteer_1.default.launch({
        // args: ["--proxy-server=27.70.167.104:10001"],
        headless: false,
        defaultViewport: null,
    });
    // Open a new page
    const page = yield browser.newPage();
    yield page.goto("https://www.digikey.com/", {
        waitUntil: "domcontentloaded",
    });
    const searchInputEl = yield page.$(".searchbox-inner-searchtext input");
    yield (searchInputEl === null || searchInputEl === void 0 ? void 0 : searchInputEl.type(manufacturePartNumber));
    yield (searchInputEl === null || searchInputEl === void 0 ? void 0 : searchInputEl.press("Enter"));
    yield page.waitForSelector("#__next");
    const a = yield page.$("#__NEXT_DATA__");
    const data = JSON.parse((yield ((_b = (yield (a === null || a === void 0 ? void 0 : a.getProperty("textContent")))) === null || _b === void 0 ? void 0 : _b.jsonValue())) || "");
    const prices = data.props.pageProps.envelope.data.priceQuantity.pricing.map((price) => price.pricingTiers);
    yield browser.close();
    const prices2 = [].concat(...prices);
    prices2.sort((a, b) => parseInt(a.breakQty.replaceAll(",", ""), 10) -
        parseInt(b.breakQty.replaceAll(",", ""), 10));
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
    fs_1.default.writeFileSync("data.json", JSON.stringify(Object.assign(Object.assign({}, dataBaseToJson), { [manufacturePartNumber.toUpperCase()]: [result] })), "utf8");
    console.log("JSON file has been saved.");
    //   console.log(priceList);
    return [
        {
            suplierName: "DigitKey",
            stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
            prices: priceList,
        },
    ];
});
const processRawData = (rawData, quantity) => {
    var _a, _b;
    // console.log(rawData);
    for (let index = 0; index < rawData.length - 1; index++) {
        const breakQty = parseInt(rawData[index].breakQty.replace(",", ""), 10);
        if (breakQty === quantity)
            return rawData[index].unitPrice;
        if (parseInt((_a = rawData[index].breakQty) === null || _a === void 0 ? void 0 : _a.replace(",", ""), 10) < quantity &&
            parseInt((_b = rawData[index + 1].breakQty) === null || _b === void 0 ? void 0 : _b.replace(",", ""), 10) > quantity)
            return rawData[index].unitPrice;
    }
    return rawData[rawData.length - 1].unitPrice;
};
