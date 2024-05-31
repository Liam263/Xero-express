const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const db = require("./db/init");
const { Sequelize } = require("sequelize");
const cron = require("node-cron");
require("dotenv").config();

const sequelize = new Sequelize(
  "postgres://default:7XCd2GfbWSgD@ep-rough-cloud-a79cocee-pooler.ap-southeast-2.aws.neon.tech:5432/verceldb?sslmode=require"
);

const app = express();
const PORT = 3000;
var ACCESS_TOKEN, REFRESH_TOKEN, ENTITY_ID;
const clientID = "77AD125B449D41429D6C6FB281770221";
const clientSecret = "7xSgCmgr8dKtrk88Lz58fsyppPl3eto0ojgPhuzOmR6_EsFB";
const redirectURL = "https://xero-express.vercel.app/callback";
var user = {};
const accountTypes = [
  { code: "BANK", name: "Bank account" },
  { code: "CURRENT", name: "Current Asset account" },
  { code: "CURRLIAB", name: "Current Liability account" },
  { code: "DEPRECIATN", name: "Depreciation account" },
  { code: "DIRECTCOSTS", name: "Direct Costs account" },
  { code: "EQUITY", name: "Equity account" },
  { code: "EXPENSE", name: "Expense account" },
  { code: "FIXED", name: "Fixed Asset account" },
  { code: "INVENTORY", name: "Inventory Asset account" },
  { code: "LIABILITY", name: "Liability account" },
  { code: "NONCURRENT", name: "Non-current Asset account" },
  { code: "OTHERINCOME", name: "Other Income account" },
  { code: "OVERHEADS", name: "Overhead account" },
  { code: "PREPAYMENT", name: "Prepayment account" },
  { code: "REVENUE", name: "Revenue account" },
  { code: "SALES", name: "Sale account" },
  { code: "TERMLIAB", name: "Non-current Liability account" },
];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Function to parse Xero timestamp format into a JavaScript Date object
function parseXeroTimestamp(xeroTimestamp) {
  // Extract the timestamp value from the Xero format
  const timestamp = parseInt(
    xeroTimestamp.replace("/Date(", "").replace(")/", "")
  );

  return new Date(timestamp);
}
const getData =  async (req, res) => {
  try {
    console.log("ACCESS_TOKEN: ", ACCESS_TOKEN);
    console.log("ENTITY_ID: ", ENTITY_ID);
    await sequelize.authenticate();
    const [assetsResponse, accountsResponse, bankTransactionsResponse] =
      await Promise.all([
        axios.get(`https://api.xero.com/assets.xro/1.0/Assets`, {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Xero-Tenant-Id": ENTITY_ID,
          },
          params: { status: "DRAFT", pageSize: 100 }, //could be Draft | Registered | Disposed
        }),
        axios.get(`https://api.xero.com/api.xro/2.0/Accounts`, {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Xero-Tenant-Id": ENTITY_ID,
          },
        }),
        axios.get(`https://api.xero.com/api.xro/2.0/BankTransactions`, {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Xero-Tenant-Id": ENTITY_ID,
          },
        }),
      ]);
    await sequelize.authenticate();

    const assets = assetsResponse.data.items;
    const accounts = accountsResponse.data.Accounts;
    const bankTransactions = bankTransactionsResponse.data.BankTransactions;

    for (const item of assets) {
      await db.Assets.upsert({
        entity_id: ENTITY_ID,
        asset_id: item.assetId,
        name: item.assetName,
        asset_number: item.assetNumber,
        purchase_date: item.purchaseDate,
        purchase_price: item.purchasePrice,
        disposal_price: item.disposalPrice,
        asset_status: item.assetStatus,
        depreciation_calculation_method: item.bookDepreciationSetting
          ? item.bookDepreciationSetting.depreciationCalculationMethod
          : null,
        depreciation_method: item.bookDepreciationSetting
          ? item.bookDepreciationSetting.depreciationMethod
          : null,
        average_method: item.bookDepreciationSetting
          ? item.bookDepreciationSetting.averagingMethod
          : null,
        depreciation_rate: item.bookDepreciationSetting
          ? item.bookDepreciationSetting.depreciationRate
          : null,
        effective_life_years: item.bookDepreciationSetting
          ? item.bookDepreciationSetting.effectiveLifeYears
          : null,
        current_capital_gain: item.bookDepreciationDetail
          ? item.bookDepreciationDetail.currentCapitalGain
          : null,
        current_capital_lost: item.bookDepreciationDetail
          ? item.bookDepreciationDetail.currentCapitalLoss
          : null,
        depreciation_start_date: item.bookDepreciationDetail
          ? item.bookDepreciationDetail.depreciationStartDate
          : null,
        cost_limits: item.bookDepreciationSetting
          ? item.bookDepreciationSetting.costLimit
          : null,
        asset_residual_value: item.bookDepreciationSetting
          ? item.bookDepreciationSetting.residualValue
          : null,
        prior_accum_depreciation_amount: item.bookDepreciationDetail
          ? item.bookDepreciationDetail.priorAccumDepreciationAmount
          : null,
        current_accum_depreciation_amount: item.bookDepreciationDetail
          ? item.bookDepreciationDetail.currentAccumDepreciationAmount
          : null,
      });
    }

    for (const account of accounts) {
      await db.ChartOfAccounts.upsert({
        account_id: account.AccountID,
        entity_id: ENTITY_ID,
        account_type: account.Type,
        account_name: account.Name,
        account_code: account.Code,
        account_description: account.Description ? account.Description : null,
        tax_type: account.TaxType,
        account_status: account.Status,
      });
    }

    for (const transaction of bankTransactions) {
      await db.BankTransactions.upsert({
        entity_id: ENTITY_ID,
        transaction_id: transaction.BankTransactionID,
        transaction_status: transaction.Status,
        contact_id: transaction.Contact ? transaction.Contact.ContactID : null,
        contact_name: transaction.Contact ? transaction.Contact.Name : null,
        transaction_date: parseXeroTimestamp(transaction.Date),
        bank_account_id: transaction.BankAccount
          ? transaction.BankAccount.AccountID
          : null,
        account_code: transaction.BankAccount
          ? transaction.BankAccount.Code
          : null,
        bank_account_name: transaction.BankAccount
          ? transaction.BankAccount.Name
          : null,
        transaction_currency: transaction.CurrencyCode,
        currency_rate: transaction.CurrencyRate
          ? transaction.CurrencyRate
          : null,
        transaction_type: transaction.Type,
        item_ID: transaction.LineItems
          ? transaction.LineItems.LineItemID
          : null,
        item_description: transaction.LineItems
          ? transaction.LineItems.Description
          : null,
        item_quantity: transaction.LineItems
          ? transaction.LineItems.Quantity
          : null,
        item_unit_price: transaction.LineItems
          ? transaction.LineItems.UnitAmount
          : null,
        sub_total: transaction.SubTotal,
        total_tax: transaction.TotalTax,
        total_amount: transaction.Total,
      });
    }
    // res.send("successful");
  } catch (error) {
    console.log(error);
    res.send("ERROR");
  }
};

app.get("/hello", async (req, res) => {res.render("hello")})
app.get("/drop", async (req, res) => {
  try {
    await db.BankTransactions.drop();
    await db.ChartOfAccounts.drop();
    await db.Assets.drop();
    await db.AccountTypes.drop();
    await db.EntityAccountsMap.drop();
    await db.SystemAccountStandard.drop();
    await db.Entity.drop();
    await db.Customer.drop();

    res.send("Successful");
  } catch (error) {
    console.log(error);
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Route to handle the redirect from Xero
app.get("/callback", async (req, res) => {
  const authorizationCode = req.query.code;

  try {
    const response = await axios.post(
      "https://identity.xero.com/connect/token",
      {
        grant_type: "authorization_code",
        code: authorizationCode,
        redirect_uri: redirectURL,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa(clientID + ":" + clientSecret),
        },
      }
    );

    const idToken = response.data.id_token;
    ACCESS_TOKEN = response.data.access_token;
    REFRESH_TOKEN = response.data.refresh_token;
    console.warn("ACCESS TOKE AT FIRST: ",ACCESS_TOKEN)
    console.warn("REFRESH TOKE AT FIRST:  ",REFRESH_TOKEN);
    // Split the token into its parts
    const [header, payloadID, signature] = idToken.split(".");
    const [headerAccess, payloadAccess, signatureAccess] =
      ACCESS_TOKEN.split(".");
    // Base64 decode the payload
    const decodedPayload = atob(payloadID);
    const decodedPayloadAccess = atob(payloadAccess);
    // Parse the decoded payload as JSON
    const payloadData = JSON.parse(decodedPayload);
    const payloadAccessData = JSON.parse(decodedPayloadAccess);

    console.log("payload: ", payloadData);
    console.log("payloadAccess: ", payloadAccessData);

    user.customer_id = payloadData.xero_userid;
    user.customer_name = payloadData.name;

    console.log("GET REFRESH TOKEN")
    jobGetRefreshToken.start();
    getConnection()
    console.log("GET REFRESH DATA")
    jobGetData.start()
    console.log("Complete");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response });
  }
});

//Check the tenants u have authorized to access
const getConnection =  async (req, res) => {
  try {
    const response = await axios.get("https://api.xero.com/connections", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + ACCESS_TOKEN,
      },
    });
    console.log(
      "customer_id: ",
      user.customer_id,
      "\ncustomer_name: ",
      user.customer_name
    );
    await db.Customer.upsert({
      customer_id: user.customer_id,
      name: user.customer_name,
    });

    for (tenant of response.data) {
      await db.Entity.upsert({
        entity_id: tenant.tenantId,
        name: tenant.tenantName,
        customer_id: user.customer_id,
      });

      for (account of accountTypes) {
        await db.AccountTypes.findOrCreate({
          where: { account_type: account.code },
          defaults: {
            entity_id: tenant.tenantId,
            account_class_type: null, // change this later
          },
        });
      }
    }

    //Choose Demo Company data for populating
    ENTITY_ID = response.data[0].tenantId;
    console.log("response: ", response.data);
    // res.send("success");
  } catch (error) {
    console.log(error.message);
  }
};

const getRefreshToken = async (req, res) => {
  try {
    const response = await axios.post(
      "https://identity.xero.com/connect/token",
      {
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN,
      },
      {
        headers: {
          Authorization: "Basic " + btoa(clientID + ":" + clientSecret),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    ACCESS_TOKEN = response.data.access_token;
    REFRESH_TOKEN = response.data.refresh_token;
    console.warn("ACCESS TOKE after refresh: ",ACCESS_TOKEN)
    console.warn("REFRESH TOKE after refresh:  ",REFRESH_TOKEN);
    // res.json(response.data);
  } catch (error) {
    console.log(error);
  }
};

// 30s for development, will be 1 day in production
const jobGetData = cron.schedule('*/30 * * * * *', getData, {scheduled:false})

// 10s for development, will be 30min day in production
const jobGetRefreshToken = cron.schedule('*/10 * * * * *', getRefreshToken, {scheduled:false})

db.test().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// db.dropDB();
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   cron.schedule('*/30 * * * * *', () => {
//     console.log('Cron job is running...');

//   })
// });

module.exports = app;