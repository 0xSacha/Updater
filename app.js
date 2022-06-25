var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var starknet = require('starknet')
var mongoDB = "mongodb+srv://Sacha:Sacha123@cluster0.qcw22fq.mongodb.net/?retryWrites=true&w=majority"
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var Schema = mongoose.Schema;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { group } = require('console');

var app = express();

// view engine setup

var moment = require('moment')
const UserSchema = new mongoose.Schema({
  userAddress: String,
  name: String,
  description: String,
  twitter: String,
  linkedin: String,
  telegram: String,
  profilePic: String
})



const ContractSchema = new mongoose.Schema({
  fundAddress: String,
  name: String,
  symbol: String,
  strategy: String,
  tags: [String],
  dataFinanceD: [{
    sharePrice: Number,
    date: Number,
    gav: Number,
  }],
  dataFinanceW: [{
    sharePrice: Number,
    date: Number,
    gav: Number,
  }],
  dataFinanceM: [{
    sharePrice: Number,
    date: Number,
    gav: Number,
  }],
  dataFinance: [{
    sharePrice: Number,
    date: Number,
    gav: Number,
  }],
  dailyIncome: Number,
  weeklyIncome: Number,
  monthlyIncome: Number,
  totalIncome: Number,
  image: String,

})
var format = require('format')

const provider = new starknet.Provider({
  baseUrl: 'https://alpha4.starknet.io',
  feederGatewayUrl: 'feeder_gateway',
  gatewayUrl: 'gateway',
})

const hexToDecimalString = hex => parseInt(hex, 16).toString()
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



const Contract = mongoose.models.Contract || mongoose.model("Contract", ContractSchema);
const UserInfo = mongoose.models.User || mongoose.model("User", UserSchema);

const comptrolleur = "0x07d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7"

function toFixed(x) {
  if (Math.abs(x) < 1.0) {
    var e = parseInt(x.toString().split('e-')[1]);
    if (e) {
      x *= Math.pow(10, e - 1);
      x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
    }
  } else {
    var e = parseInt(x.toString().split('+')[1]);
    if (e > 20) {
      e -= 20;
      x /= Math.pow(10, e);
      x += (new Array(e + 1)).join('0');
    }
  }
  return x;
}

function h2d(s) {

  function add(x, y) {
    var c = 0, r = [];
    var x = x.split('').map(Number);
    var y = y.split('').map(Number);
    while (x.length || y.length) {
      var s = (x.pop() || 0) + (y.pop() || 0) + c;
      r.unshift(s < 10 ? s : s - 10);
      c = s < 10 ? 0 : 1;
    }
    if (c) r.unshift(c);
    return r.join('');
  }

  var dec = '0';
  s.split('').forEach(function (chr) {
    var n = parseInt(chr, 16);
    for (var t = 8; t; t >>= 1) {
      dec = add(dec, dec);
      if (n & t) dec = add(dec, '1');
    }
  });
  return dec;
}

async function post(tab) {
  let target = await Contract.findOneAndReplace({ fundAddress: tab.fundAddress }, tab);
  console.log(target.fundAddress)
  console.log("sofuckking bulish")
}

async function run() {

  // Find all customers
  const docs = await Contract.find();
  // let target = Contract.findOne({ fundAddress: docs[0].fundAddress });


  for (let index = 0; index < docs.length; index++) {
    DataFinance = docs[index].dataFinance
    let currentDataFinance = {
      sharePrice: 0,
      date: 0,
      gav: 0,
    }

    let FinalRender = {
      fundAddress: docs[index].fundAddress,
      name: docs[index].name,
      symbol: docs[index].symbol,
      strategy: docs[index].strategy,
      tags: docs[index].tags,
      dataFinanceD: [],
      dataFinanceW: [],
      dataFinanceM: [],
      dataFinance: [],
      dailyIncome: 0,
      weeklyIncome: 0,
      monthlyIncome: 0,
      totalIncome: 0,
      image: docs[index].image
    }

    console.log(docs[index].fundAddress)
    let x = h2d(docs[index].fundAddress)
    // console.log(x)

    const res1 = provider.callContract({
      contractAddress: comptrolleur,
      entrypoint: "getSharePrice",
      calldata: [x]
    });
    res1
      .then((value) => {
        const sharePrice_ = h2d(value.result[0]);
        currentDataFinance.sharePrice = (parseFloat(sharePrice_) / 1000000000000000000)

        const res2 = provider.callContract({
          contractAddress: comptrolleur,
          entrypoint: "calculGav",
          calldata: [x]
        });
        res2
          .then((value) => {
            const gav_ = h2d((value.result[0]));
            currentDataFinance.gav = (parseFloat(gav_) / 1000000000000000000)
            currentDataFinance.date = Date.now()
            DataFinance.push(currentDataFinance)
            console.log(DataFinance)

            if (DataFinance) {
              let Daily_Income = 0
              let Total_Income = 0
              let Weekly_Income = 0
              let Monthly_Income = 0



              let list = DataFinance
              //convert date in epoch
              let tabEpoch = [];
              list.forEach((d) => {
                tabEpoch.push(d.date); // date -> epoch
              });


              if (list.length != 0) {
                Total_Income = (((list[list.length - 1].sharePrice - list[0].sharePrice) /
                  list[0].sharePrice) * 100)
              }
              else {
                Total_Income = 0
              }


              let day_epoch = moment().subtract(1, "days").valueOf();

              const closestD = tabEpoch.reduce((a, b) => {
                return Math.abs(b - day_epoch) < Math.abs(a - day_epoch) ? b : a;
              });
              let closestIndexD = tabEpoch.indexOf(closestD);
              let diffEpochD = Math.abs(day_epoch - closestD);
              if (diffEpochD <= 3600000) {
                Daily_Income =
                  ((list[list.length - 1].sharePrice - list[closestIndexD].sharePrice) /
                    list[closestIndexD].sharePrice) *
                  100

              } else {
                Daily_Income = 0;
              }

              let week_epoch = moment().subtract(1, "weeks").valueOf();
              const closestW = tabEpoch.reduce((a, b) => {
                return Math.abs(b - week_epoch) < Math.abs(a - week_epoch) ? b : a;
              });
              let closestIndexW = tabEpoch.indexOf(closestW);
              let diffEpochW = Math.abs(week_epoch - closestW);
              if (diffEpochW <= 3600000) {
                Weekly_Income =
                  (((list[list.length - 1].sharePrice - list[closestIndexW].sharePrice) /
                    list[closestIndexW].sharePrice) *
                    100
                  )
              } else {
                Weekly_Income = 0
              }

              let month_epoch = moment().subtract(1, "months").valueOf();
              const closestM = tabEpoch.reduce((a, b) => {
                return Math.abs(b - month_epoch) < Math.abs(a - month_epoch) ? b : a;
              });
              let closestIndexM = tabEpoch.indexOf(closestM);
              let diffEpochM = Math.abs(month_epoch - closestM);
              if (diffEpochM < 3600000) {
                Monthly_Income = (
                  ((list[list.length - 1].sharePrice - list[closestIndexM].sharePrice) /
                    list[closestIndexM].sharePrice) *
                  100
                );
              } else {
                Monthly_Income = 0;
              }

              let RenderDaily = []
              let RenderWeekly = []
              let RenderMonthly = []
              let RenderTotal = []

              if (diffEpochD >= 3600000) {
                let elemAmount = Math.floor(diffEpochD / 3600000);
                for (let pas = 0; pas < elemAmount; pas++) {
                  let _epoch = day_epoch + pas * 3600000;
                  let _sharePrice = 0;
                  let _gav = 0;
                  RenderDaily.push({
                    date: _epoch,
                    sharePrice: _sharePrice,
                    gav: _gav,
                  });
                }
              }
              for (let pas = closestIndexD; pas < tabEpoch.length; pas++) {
                let _epoch = tabEpoch[pas];
                let _sharePrice = list[pas].sharePrice;
                let _gav = list[pas].gav;
                RenderDaily.push({
                  date: _epoch,
                  sharePrice: _sharePrice,
                  gav: _gav,
                });
              }



              if (diffEpochW >= 3600000) {
                let elemAmount = Math.floor(diffEpochW / 3600000);
                for (let pas = 0; pas < elemAmount; pas++) {
                  let _epoch = week_epoch + pas * 3600000;
                  let _sharePrice = 0;
                  let _gav = 0;
                  RenderWeekly.push({
                    date: _epoch,
                    sharePrice: _sharePrice,
                    gav: _gav,
                  });
                }
              }
              for (let pas = closestIndexW; pas < tabEpoch.length; pas++) {
                let _epoch = tabEpoch[pas];
                let _sharePrice = list[pas].sharePrice;
                let _gav = list[pas].gav;
                RenderWeekly.push({
                  date: _epoch,
                  sharePrice: _sharePrice,
                  gav: _gav,
                });
              }


              if (diffEpochM >= 3600000) {
                let elemAmount = Math.floor(diffEpochM / 3600000);
                for (let pas = 0; pas < elemAmount; pas++) {
                  let _epoch = month_epoch + pas * 3600000;
                  let _sharePrice = 0;
                  let _gav = 0;
                  RenderMonthly.push({
                    date: _epoch,
                    sharePrice: _sharePrice,
                    gav: _gav,
                  });
                }
              }
              for (let pas = closestIndexM; pas < tabEpoch.length; pas++) {
                let _epoch = tabEpoch[pas];
                let _sharePrice = list[pas].sharePrice;
                let _gav = list[pas].gav;
                RenderMonthly.push({
                  date: _epoch,
                  sharePrice: _sharePrice,
                  gav: _gav,
                });
              }

              for (let pas = 0; pas < tabEpoch.length; pas++) {
                let _epoch = tabEpoch[pas];
                let _sharePrice = list[pas].sharePrice;
                let _gav = list[pas].gav;
                RenderTotal.push({
                  date: _epoch,
                  sharePrice: _sharePrice,
                  gav: _gav,
                });
              }

              // console.log(Daily_Income)
              // console.log(Total_Income)
              // console.log(Weekly_Income)
              // console.log(Monthly_Income)
              // console.log(RenderWeekly)
              // console.log(RenderDaily)
              // console.log(RenderMonthly)
              // console.log(RenderTotal)
              FinalRender.dailyIncome = Daily_Income
              FinalRender.weeklyIncome = Weekly_Income
              FinalRender.monthlyIncome = Monthly_Income
              FinalRender.totalIncome = Total_Income
              FinalRender.dataFinanceD = RenderDaily
              FinalRender.dataFinanceW = RenderWeekly
              FinalRender.dataFinanceM = RenderMonthly
              FinalRender.dataFinance = RenderTotal
              console.log(FinalRender)
              post(FinalRender)
            }


          })
          .catch((err) => {
            console.log(err);
          });


      })
      .catch((err) => {
        console.log(err);
      });




  }
}

var minutes = 5
var the_interval = minutes * 60 * 1000;

setInterval(function () {
  console.log("I am doing my 5 minutes check");
  run()
}, the_interval);

setInterval(function () {
  console.log("I am doing my 15minutes check");
}, 15000);


module.exports = app;
