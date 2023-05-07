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
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const MouserURL_1 = require("./MouserURL");
const app = (0, express_1.default)();
const port = 8000;
const priceQuantityList = [1, 10, 100, 1000, 10000];
app.use((0, cors_1.default)());
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //Molex 733910060
        const query = req.query.search;
        console.log(query);
        //PIS150H-471M
        const data = yield getPartInfo((query === null || query === void 0 ? void 0 : query.trim()) || 'PIS150H-471M');
        res.status(200).json(data);
        //   res.statusCode(200).send(data);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}));
app.get('/mouser', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield getMouserPartInfo();
    res.status(200).json(data);
}));
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
const getMouserPartInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    const url3 = 'https://www.mouser.com/ProductDetail/Anderson-Power-Products/PS1T24-7X?qs=tub3WQyKOl84j5Li7EeCmw%3D%3D';
    const url4 = 'https://www.mouser.com/ProductDetail/Anderson-Power-Products/996G1?qs=yoCgdRjoRtHoIhHdbwYFHA%3D%3D';
    const url2 = 'https://www.mouser.com/ProductDetail/Molex/214756-1022?qs=sGAEpiMZZMsAepjoiJLcxrnVSsNkGrMaPwM3VPW%2F0Ic%2FO46BGx2zVQ%3D%3D';
    const urls = [url4, url2];
    const dataBase = fs_1.default.readFileSync('data.json', 'utf-8');
    const dataBaseToJson = JSON.parse(dataBase || '');
    // Open a new page
    yield Promise.all(MouserURL_1.MOUSER_URL.map((url) => __awaiter(void 0, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            // args: ["--proxy-server=27.70.167.104:10001"],
            headless: false,
            defaultViewport: null,
        });
        const page = yield browser.newPage();
        yield page.goto(url, {
            waitUntil: 'domcontentloaded',
        });
        const manufacturerPartNumber = (yield page.evaluate(() => {
            var _a, _b;
            return (_b = (_a = document
                .querySelector('#spnManufacturerPartNumber')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim();
        }));
        // if (!manufacturerPartNumber) continue;
        console.log(manufacturerPartNumber);
        const stock = yield page.evaluate(() => {
            var _a;
            const stockDiv = document.querySelector('#pdpPricingAvailability h2');
            return (_a = stockDiv === null || stockDiv === void 0 ? void 0 : stockDiv.textContent) === null || _a === void 0 ? void 0 : _a.trim().replace(/\n/g, '').replace('In Stock: ', '');
        });
        const data = yield page.evaluate(() => {
            const tds = Array.from(document.querySelectorAll('.pricing-table td'));
            return tds.map((td) => { var _a; return (_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim().replace(/\n/g, ''); });
        });
        data.pop();
        data.pop();
        const actualData = processDataMouser(data);
        const priceList = priceQuantityList.map((quantity) => {
            return processRawData(actualData, quantity);
        });
        if (dataBaseToJson[manufacturerPartNumber]) {
            dataBaseToJson[manufacturerPartNumber].push({
                suplierName: 'Mouser',
                stock,
                prices: priceList,
                pricingTiers: actualData,
            });
        }
        yield browser.close();
    })));
    fs_1.default.writeFileSync('data.json', JSON.stringify(Object.assign({}, dataBaseToJson)), 'utf8');
    // console.log(data);
    // return {
    //   suplierName: 'Mouser',
    //   stock,
    //   prices: priceList,
    //   // pricingTiers: actualData,
    // };
});
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const processDataMouser = (data) => {
    const actualData = [];
    for (let index = 0; index < data.length; index += 2) {
        const unitPrice = data[index];
        const extendedPrice = data[index + 1];
        const breakQty = parseFloat(extendedPrice.replace('$', '').replace(',', '')) /
            parseFloat(unitPrice.replace('$', ''));
        actualData.push({
            breakQty: `${breakQty}`,
            unitPrice,
            extendedPrice,
        });
    }
    return actualData;
};
const getPartInfo = (manufacturePartNumber) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const dataBase = fs_1.default.readFileSync('data.json', 'utf-8');
    const dataBaseToJson = JSON.parse(dataBase || '');
    const map = new Map(Object.entries(dataBaseToJson));
    if (map.has(manufacturePartNumber.toUpperCase())) {
        return map.get(manufacturePartNumber.toUpperCase());
    }
    // console.log(JSON.parse(dataBase));
    //   return;
    const browser = yield puppeteer_1.default.launch({
        // args: ["--proxy-server=27.70.167.104:10001"],
        headless: false,
        defaultViewport: null,
    });
    // Open a new page
    const page = yield browser.newPage();
    yield page.goto('https://www.digikey.com/', {
        waitUntil: 'domcontentloaded',
    });
    const searchInputEl = yield page.$('.searchbox-inner-searchtext input');
    yield (searchInputEl === null || searchInputEl === void 0 ? void 0 : searchInputEl.type(manufacturePartNumber));
    yield (searchInputEl === null || searchInputEl === void 0 ? void 0 : searchInputEl.press('Enter'));
    yield page.waitForSelector('#__next');
    const a = yield page.$('#__NEXT_DATA__');
    const data = JSON.parse((yield ((_a = (yield (a === null || a === void 0 ? void 0 : a.getProperty('textContent')))) === null || _a === void 0 ? void 0 : _a.jsonValue())) || '');
    const prices = data.props.pageProps.envelope.data.priceQuantity.pricing.map((price) => price.pricingTiers);
    yield browser.close();
    const prices2 = [].concat(...prices);
    prices2.sort((a, b) => parseInt(a.breakQty.replaceAll(',', ''), 10) -
        parseInt(b.breakQty.replaceAll(',', ''), 10));
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
    fs_1.default.writeFileSync('data.json', JSON.stringify(Object.assign(Object.assign({}, dataBaseToJson), { [manufacturePartNumber.toUpperCase()]: [result] })), 'utf8');
    console.log('JSON file has been saved.');
    //   console.log(priceList);
    return [
        {
            suplierName: 'DigitKey',
            stock: data.props.pageProps.envelope.data.priceQuantity.qtyAvailable,
            prices: priceList,
        },
    ];
});
const processRawData = (rawData, quantity) => {
    for (let index = 0; index < rawData.length - 1; index++) {
        const breakQty = parseInt(rawData[index].breakQty.replaceAll(',', ''), 10);
        if (breakQty === quantity)
            return rawData[index].unitPrice;
        if (parseInt(rawData[index].breakQty.replaceAll(',', ''), 10) < quantity &&
            parseInt(rawData[index + 1].breakQty.replaceAll(',', ''), 10) > quantity)
            return rawData[index].unitPrice;
    }
    return rawData[rawData.length - 1].unitPrice;
};
