const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const db = require("../db/init");
const { Sequelize } = require("sequelize");
const { max } = require("drizzle-orm");
require("dotenv").config();

const sequelize = new Sequelize(
  "postgres://default:7XCd2GfbWSgD@ep-rough-cloud-a79cocee-pooler.ap-southeast-2.aws.neon.tech:5432/verceldb?sslmode=require"
);

const app = express();
const PORT = 3000;
var ACCESS_TOKEN, REFRESH_TOKEN, ENTITY_ID;

// Get these info from client 
const clientID = "7D3D642AB4AF400B9119AE2D04BAFEAC";
const clientSecret = "MMxNGeiM0iW5fmQ_j9jXLSL1MGzhAgXVRFTqZ9sGcM92W8Wf";

const redirectURL = "https://xero-express.vercel.app/callback";
var user = {};
const BATCH_SIZE = 70;
var currentUserIndex = 0;
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
app.get("/getData", async (req, res) => {
  try {
    if (!ACCESS_TOKEN || !ENTITY_ID) {
      console.log("ACCESS_TOKEN: ", ACCESS_TOKEN);
      console.log("ENTITY_ID: ", ENTITY_ID);

      return res.status(404).send("ACCESS_TOKEN or ENTITY_ID is missing");
    }

    const [
      assetsResponse,
      accountsResponse,
      bankTransactionsResponse,
      EntityResponse,
    ] = await Promise.all([
      axios.get(`https://api.xero.com/assets.xro/1.0/Assets`, {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Xero-Tenant-Id": ENTITY_ID,
        },
        params: { status: "REGISTERED", pageSize: 100 }, //could be Draft | Registered | Disposed
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
      db.Entity.findByPk(ENTITY_ID),
    ]);

    const assets = assetsResponse.data.items;
    const accounts = accountsResponse.data.Accounts;
    const bankTransactions = bankTransactionsResponse.data.BankTransactions;
    const count = EntityResponse.dataValues.count;
    const t = await sequelize.transaction();
    maxLength = Math.max(
      assets.length,
      accounts.length,
      bankTransactions.length
    );

    if (count >= maxLength + BATCH_SIZE) {
      console.log("Count: ", count);
      console.log("Count max is reached");
      await db.Entity.update(
        {
          count: 0,
        },
        { where: { entity_id: ENTITY_ID } },
        {
          transaction: t,
        }
      );

      return res.send("COUNT MAX REACHED")
    }

    await db.Entity.update(
      {
        count: count + BATCH_SIZE,
      },
      { where: { entity_id: ENTITY_ID } },
      {
        transaction: t,
      }
    );

    const assetsBatch = assets.slice(count, count + BATCH_SIZE);
    for (const item of assetsBatch) {
      await db.Assets.upsert(
        {
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
        },
        { transaction: t }
      );
    }

    const accountsBatch = accounts.slice(count, count + BATCH_SIZE);
    for (const account of accountsBatch) {
      await db.ChartOfAccounts.upsert(
        {
          account_id: account.AccountID,
          entity_id: ENTITY_ID,
          account_type: account.Type,
          account_name: account.Name,
          account_code: account.Code,
          account_description: account.Description ? account.Description : null,
          tax_type: account.TaxType,
          account_status: account.Status,
        },
        { transaction: t }
      );
    }

    const transactionBatch = bankTransactions.slice(count, count + BATCH_SIZE);
    for (const transaction of transactionBatch) {
      await db.BankTransactions.upsert(
        {
          entity_id: ENTITY_ID,
          transaction_id: transaction.BankTransactionID,
          transaction_status: transaction.Status,
          contact_id: transaction.Contact
            ? transaction.Contact.ContactID
            : null,
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
        },
        { transaction: t }
      );
    }
    await t.commit();
    console.log("ACCESS TOKEN :", ACCESS_TOKEN);
    console.log("REFRESH TOKEN :", REFRESH_TOKEN);
    console.log("ENTITY ID :", ENTITY_ID);
    console.log("ASSETS count: ", assets.length);
    console.log("Accounts count: ", accounts.length);
    console.log("Bank Transaction count: ", bankTransactions.length);
    res.send("SUCCESSFUL");
  } catch (error) {
    console.log(error);
    console.log("ACCESS TOKEN :", ACCESS_TOKEN);
    console.log("REFRESH TOKEN :", REFRESH_TOKEN);
    console.log("ENTITY ID :", ENTITY_ID);
    console.log("count: ", count);
    // await t.rollback();
  }
});

app.get("/hello", async (req, res) => {
  console.log("ACCESS TOKEN :", ACCESS_TOKEN);
  console.log("REFRESH TOKEN :", REFRESH_TOKEN);
  console.log("ENTITY ID :", ENTITY_ID);

  res.send("hello");
});
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

    // Split the token into its parts
    const [header, payloadID, signature] = idToken.split(".");

    // Base64 decode the payload
    const decodedPayload = atob(payloadID);
    // Parse the decoded payload as JSON
    const payloadData = JSON.parse(decodedPayload);

    user.customer_id = payloadData.xero_userid;
    user.customer_name = payloadData.name;
    ACCESS_TOKEN = response.data.access_token;
    REFRESH_TOKEN = response.data.refresh_token;
    console.log("Create DB: ");

    // await db.createDB();
    await getConnection();

    console.log("ACCESS TOKE AT FIRST: ", ACCESS_TOKEN);
    console.log("REFRESH TOKE AT FIRST:  ", REFRESH_TOKEN);
    console.log("ENTITY ID:", ENTITY_ID);
    console.log("Complete");
    res.redirect("/");
    // res.json(response.data)
    // redirectURL('/')
  } catch (error) {
    res.status(500).json({ error: error.response });
  }
});

//Check the tenants u have authorized to access
const getConnection = async (req, res) => {
  try {
    const response = await axios.get("https://api.xero.com/connections", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + ACCESS_TOKEN,
      },
    });

    const t = await sequelize.transaction();
    try {
      await db.Customer.upsert(
        {
          customer_id: user.customer_id,
          name: user.customer_name,
          access_token: ACCESS_TOKEN,
          refresh_token: REFRESH_TOKEN,
        },
        {
          transaction: t,
        }
      );

      for (tenant of response.data) {
        await db.Entity.upsert(
          {
            entity_id: tenant.tenantId,
            name: tenant.tenantName,
            customer_id: user.customer_id,
            count: 0,
          },
          {
            transaction: t,
          }
        );

        for (account of accountTypes) {
          await db.AccountTypes.upsert(
            {
              account_type: account.code,
              entity_id: tenant.tenantId,
              account_class_type: null, // change this later
            },
            { transaction: t }
          );
        }
      }

      await t.commit();
    } catch (error) {
      console.error(error);
      await t.rollback();
    }

    //Choose Demo Company data for populating
    ENTITY_ID = response.data[0].tenantId;
    console.log("response: ", response.data);
    // res.send("success");
  } catch (error) {
    console.log(error.message);
  }
};

app.get("/getRefreshToken", async (req, res) => {
  try {
    const [Users, Entity] = await Promise.all([
      db.Customer.findAll({ order: [["updatedAt", "DESC"]] }),
      db.Entity.findAll({ order: [["updatedAt", "DESC"]] }),
    ]);

    const response = await axios.post(
      "https://identity.xero.com/connect/token",
      {
        grant_type: "refresh_token",
        refresh_token: Users[0].dataValues.refresh_token, // get the latest user only
      },
      {
        headers: {
          Authorization: "Basic " + btoa(clientID + ":" + clientSecret),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    await db.Customer.upsert({
      customer_id: Users[0].dataValues.customer_id,
      name: Users[0].dataValues.name,
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    });

    // user.customer_id = Users[Users.length-1].dataValues.customer_id;
    ACCESS_TOKEN = response.data.access_token;
    REFRESH_TOKEN = response.data.refresh_token;
    // ENTITY_ID = Entity[0].dataValues.entity_id; // temporary get the  lastest entity
    //test
    for (const entity of Entity) {
      if (entity.dataValues.customer_id === Users[0].dataValues.customer_id) {
        ENTITY_ID = entity.dataValues.entity_id;
      }
    }
    console.log("Refresh token after: ", REFRESH_TOKEN);
    console.log("Access token after: ", ACCESS_TOKEN);
    console.log("ENTITY_ID : ", ENTITY_ID);

    // console.log("User: ", Users);
    // console.log("Entity: ", Entity);

    res.json(response.data);

    // res.send("success");
  } catch (error) {
    console.log("Refresh token in ERROR: ", REFRESH_TOKEN);
    console.log("Access token in ERROR: ", ACCESS_TOKEN);
    console.log("ENTITY :", ENTITY_ID);
    console.log(error);
  }
});

// db.dropDB();
// db.createDB()

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
module.exports = app;
