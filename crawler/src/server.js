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
const app = (0, express_1.default)();
const port = 8000;
app.use((0, cors_1.default)());
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //Molex 733910060
    const query = req.query.search;
    console.log(query);
    //PIS150H-471M
    const data = yield getPartInfo(query || "PIS150H-471M");
    res.status(200).json(data);
    //   res.statusCode(200).send(data);
}));
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
const getPartInfo = (partId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const dataBase = fs_1.default.readFileSync("data.json", "utf-8");
    const dataBaseToJson = JSON.parse(dataBase || "");
    const map = new Map(Object.entries(dataBaseToJson));
    if (map.has(partId.toUpperCase())) {
        return [map.get(partId.toUpperCase())];
    }
    console.log(JSON.parse(dataBase));
    //   return;
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
    yield (searchInputEl === null || searchInputEl === void 0 ? void 0 : searchInputEl.type(partId));
    yield (searchInputEl === null || searchInputEl === void 0 ? void 0 : searchInputEl.press("Enter"));
    yield page.waitForSelector("#__next");
    const a = yield page.$("#__NEXT_DATA__");
    const data = JSON.parse((yield ((_a = (yield (a === null || a === void 0 ? void 0 : a.getProperty("textContent")))) === null || _a === void 0 ? void 0 : _a.jsonValue())) || "");
    const prices = data.props.pageProps.envelope.data.priceQuantity.pricing.map((price) => price.pricingTiers);
    //   console.log(t.props.pageProps);
    yield browser.close();
    const prices2 = [].concat(...prices);
    prices2.sort((a, b) => parseInt(a.breakQty.replaceAll(",", ""), 10) -
        parseInt(b.breakQty.replaceAll(",", ""), 10));
    //   console.log(prices2);
    const priceQuantityList = [1, 10, 100, 1000, 10000];
    const priceList = priceQuantityList.map((quantity) => {
        for (let index = 0; index < prices2.length - 1; index++) {
            const breakQty = parseInt(prices2[index].breakQty.replaceAll(",", ""), 10);
            if (breakQty === quantity)
                return prices2[index].unitPrice;
            if (parseInt(prices2[index].breakQty.replaceAll(",", ""), 10) < quantity &&
                parseInt(prices2[index + 1].breakQty.replaceAll(",", ""), 10) > quantity)
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
    fs_1.default.writeFileSync("data.json", JSON.stringify(Object.assign(Object.assign({}, dataBaseToJson), { [partId.toUpperCase()]: result })), "utf8");
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
