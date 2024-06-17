const { primaryKey } = require("drizzle-orm/pg-core");
const { Pool } = require("pg");
POSTGRES_URL="postgres://default:7XCd2GfbWSgD@ep-rough-cloud-a79cocee-pooler.ap-southeast-2.aws.neon.tech:5432/verceldb?sslmode=require"
const { Sequelize , DataTypes, UUIDV4} = require('sequelize');

const sequelize = new Sequelize('postgres://default:7XCd2GfbWSgD@ep-rough-cloud-a79cocee-pooler.ap-southeast-2.aws.neon.tech:5432/verceldb?sslmode=require') 


const pool = new Pool({
  connectionString: POSTGRES_URL,
});



const Customer = sequelize.define('Customer', {
  customer_id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  }, 
  access_token: {
    type: DataTypes.STRING(2000)
  }
  ,
  refresh_token: {
    type: DataTypes.STRING(255)
  }
});

const Entity = sequelize.define('Entity', {
  entity_id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Customer, 
      key: 'customer_id'
    }
  },
  count: {
    type:DataTypes.INTEGER
  }
});

const SystemAccountStandard = sequelize.define('System_Account_Standard', {
  system_account_code: {
    type: DataTypes.STRING(255),
    allowNull: true, 
    primaryKey: true
  },
  system_account_class: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  system_account_name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  system_account_description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

const EntityAccountsMap = sequelize.define('Entity_Accounts_Map', {
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false, 
    primaryKey: true,
    // references: {
    //   model: Entity,
    //   key: 'entity_id'
    // }, 
    // unique: true
  },
  entity_account_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    primaryKey: true
  },
  system_account_code: {
    type: DataTypes.STRING(255),
    allowNull: true,
    references: {
      model: SystemAccountStandard,
      key: 'system_account_code'
    }
  }
});



const AccountTypes = sequelize.define('Account_Types', {
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false, 
    primaryKey: true
  },
  account_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    primaryKey: true,
  },
  account_class_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
});

const Assets = sequelize.define('Assets', {
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Entity,
      key: 'entity_id'
    },
    primaryKeypri:true
  },
  asset_id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  asset_number: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  purchase_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchase_price: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  },
  disposal_price: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  },
  asset_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  depreciation_calculation_method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  depreciation_method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  average_method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  depreciation_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  effective_life_years: {
    type: DataTypes.NUMERIC(10, 2),
    allowNull: true
  },
  current_capital_gain: {
    type: DataTypes.NUMERIC(18, 2),
    allowNull: true
  },
  current_capital_lost: {
    type: DataTypes.NUMERIC(18, 2),
    allowNull: true
  },
  depreciation_start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cost_limits: {
    type: DataTypes.NUMERIC(18, 2),
    allowNull: true
  },
  asset_residual_value: {
    type: DataTypes.NUMERIC(18, 2),
    allowNull: true
  },
  prior_accum_depreciation_amount: {
    type: DataTypes.NUMERIC(18, 2),
    allowNull: true
  },
  current_accum_depreciation_amount: {
    type: DataTypes.NUMERIC(18, 2),
    allowNull: true
  }
});

const ChartOfAccounts = sequelize.define('Chart_of_accounts', {
  account_id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true
    // references: {
    //   model: EntityAccountsMap,
    //   key: 'entity_id'
    // }
    // unique: true
  },
  account_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    // references: {
    //   model: AccountTypes,
    //   key: 'account_type'
    // }
  },
  account_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  account_code: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  account_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tax_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  account_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
});

const BankTransactions = sequelize.define('Bank_Transactions', {
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true
    // references: {
    //   model: ChartOfAccounts,
    //   key: 'entity_id'
    // }
  },
  transaction_id: {
    type: DataTypes.STRING(255),
    allowNull: true, 
    primaryKey: true
  },
  transaction_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  contact_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  contact_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  transaction_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bank_account_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  account_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    // references: {
    //   model: ChartOfAccounts,
    //   key: 'account_code'
    // }
  },
  bank_account_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  transaction_currency: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  currency_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  transaction_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  item_ID: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  item_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  item_quantity: {
    type: DataTypes.NUMERIC(10, 2),
    allowNull: true
  },
  item_unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  sub_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  total_tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
});



const createDB = async () => {

  await sequelize.sync()
  console.log('Reach create DB')
}

const dropDB = async () => {
  await BankTransactions.drop();
  await ChartOfAccounts.drop();
  await Assets.drop();
  await AccountTypes.drop();
  await EntityAccountsMap.drop();
  await SystemAccountStandard.drop();
  await Entity.drop();
  await Customer.drop(); 
}

module.exports = {
  query: (text, params) => pool.query(text, params),
   createDB,dropDB, Customer, Assets, AccountTypes,
   BankTransactions, ChartOfAccounts, Entity,
   EntityAccountsMap, SystemAccountStandard
};






