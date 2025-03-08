import express  from 'express';
import userAgent  from 'user-agents';
import puppeteerExtra  from 'puppeteer-extra';
import Stealth from 'puppeteer-extra-plugin-stealth'
import util from 'util';
import child_process from 'child_process';
import fs from "node:fs";
import TelegramBot from 'node-telegram-bot-api';
let chat_ids = {};
let tickets_data = {};

// Replace with your bot's token
const token = '7645960989:AAGRJvuVP7e1g8LbXLFiWhcx0nVsZcDl1Rc';
// const token = '8087307960:AAGX410IHQAITvmmbEbXa-EjnUxIdi72F-I';
// const token = '8151038148:AAF6GGH1lp8XhjkyrmaKApo6cRdzTA5lDLo';

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });
// Listen for all messages
bot.on('message', (msg) => {
  console.log('Received message:', msg);
  const chatId = msg.chat.id;
  chat_ids[chatId] = true;
  fs.writeFile( "./total_chats.json", JSON.stringify( chat_ids ), "utf8", ()=>{} );
});


const exec = util.promisify(child_process.exec);

// const express = require('express')
const app = express()
const port = 3000
let total_data = {};
const sites = {};

fs.readFile("./total_data.json", {encoding: 'utf-8'}, function(err,data){
    if (!err) {
      total_data = JSON.parse(data);
    } else {
        console.log(err);
    }
});

fs.readFile("./total_chats.json", {encoding: 'utf-8'}, function(err,data){
    if (!err) {
      chat_ids = JSON.parse(data);
    } else {
        console.log(err);
    }
});
puppeteerExtra.use(Stealth());

// Launch the browser and open a new blank page
const browser = await puppeteerExtra.launch({headless:false});
// first bot
scrapeSite("https://resell.webook.com/ar");



async function aquire_solution(file){
  let script_path = '"'+import.meta.dirname+"\\Captcha solver\\index.py"+'"';
  let file_path = '"'+import.meta.dirname+"\\Captcha solver\\"+file+'"';
  // console.log(script_path)
  console.log("started solving captcha");
  const { stdout, stderr }  = await exec("python "+script_path+" "+file_path);
  console.log(stdout)
  // console.log(stderr)
  return stdout;
}


async function scrapeSite(url) {
  console.log("new scraping");
  let page = await browser.newPage();
  sites[url] = page;
  await page.setUserAgent(
     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
   );
  await page.goto(url, {timeout: 60000 * 60, waitUntil: ["networkidle0", "domcontentloaded"]});
  await page.setViewport({width: 1080, height: 1024});
  await loop(url);

  async function loop(url){

    // if(page.url().indexOf("queue.platinumlist") > 0){
    //   await captcha_solver();
    // }
  // Array.prototype.filter.call(document.querySelectorAll('.carousel-item__title'), (x)=> x.href.indexOf("riyadh") > 0)
  // document.querySelector("#main > section.container > div > button").disabled == false

  // clicking the load more button
  let loaded_all = false;
  while (loaded_all == false) {
    await page.evaluate(() => {
      document.querySelector("#main > section.container > div > button").click();
      return true;
    });
    await delay(3000);
    loaded_all = await page.evaluate(() => {
      return document.querySelector("#main > section.container > div > button").disabled == true;
    });
  }
    

      let data = await page.evaluate(() => {
        let items = document.querySelectorAll("#main > section.container > div > a");
        let dt = [];
        items.forEach((elem) => {
          // if(elem.getAttribute("href").indexOf(/[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/.exec(url)[0]) >= 0){
            let data = {
              "title" : "",
              "link" : "",
              "starting_price" : "",
              "date" : "",
            };
            data.link = location.origin + elem.getAttribute("href");
            data.starting_price = elem.querySelectorAll("p")[2].innerText;
            data.date = elem.querySelector(".text-xs").innerText;
            data.title = elem.querySelector("p").innerText;
            dt.push(data);
        });
        return dt;
      });
    let refresh_data = false;
    data.forEach((dt)=>{
          if((dt.link in total_data) == false ){
            total_data[dt.link] = dt;
            refresh_data = true;
            for (const chatId in chat_ids) {
              bot.sendMessage(chatId, `${dt.title}\n${dt.link}\n${dt.starting_price}\n ${dt.date}`)
              .then(() => {
                  // console.log('Message sent successfully');
              })
              .catch((error) => {
                setTimeout(()=>{ bot.sendMessage(chatId, `${dt.title}\n${dt.link}\n${dt.starting_price}\n ${dt.date}`)}, 5000)
              });
            }
            search_page_for_new_tickets(dt.link);
          }
    });
    if(refresh_data){
      fs.writeFile( "./total_data.json", JSON.stringify( total_data ), "utf8", ()=>{} );
    }
    await search_every_page(data);
    await delay(7000);
    await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"], timeout:60000 * 60 * 5 });
    return loop(url);
  


  }
}

async function captcha_solver(){
    console.log("captcha page");
    await page.waitForSelector('.captcha-code');
    let image = await page.evaluate('document.querySelector(".captcha-code").getAttribute("src")');
    let b64 = image.split("base64,")[1];
    let reg = /data:image\/([^;]+)+;/i
    let type = reg.exec(image)[1]
    const buffer = Buffer.from(b64, "base64");
    const file_name = "CAPTCHA."+type;
    fs.writeFileSync("./Captcha solver/CAPTCHA."+type, buffer);
    let solution = (await aquire_solution(file_name)).trim();
    solution = JSON.parse(solution.replaceAll("'", '"'));
    // CaptchaCode
    await page.locator('#solution').fill(solution.join(""));
    await page.keyboard.press('Enter');
    await delay(7000);
    if(page.url().indexOf("queue.platinumlist") > 0){
        return await captcha_solver();
      }else{
        return ;
      }

}

async function search_page_for_new_tickets( link ){
  let page = await browser.newPage();
  await page.setUserAgent(
     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
   );
  await page.goto(link, {timeout: 60000 * 60, waitUntil: ["networkidle0", "domcontentloaded"]});
  await page.setViewport({width: 1080, height: 1024});
  //tickets_data
  let ticket_ids = await page.evaluate(() => {
    dt = Array.prototype.map.call(document.querySelectorAll("#main > section > div > div > div.overflow-hidden > div > div > ul > li"), (x)=>x.getAttribute("id"));
    return dt;
  });
  let notify = false;
  if(tickets_data[link] == null){
    notify = true;
    tickets_data[link] = ticket_ids;
  }else{
    ticket_ids.forEach((id)=>{
        let exists = false;
        tickets_data[link].forEach((_id)=>{
          if(_id == id) exists = true;
        })
        if(exists == false){
          tickets_data[link].push(id);
          notify = true;
        }
    })
  }

  if(notify){
     for (const chatId in chat_ids) {
              bot.sendMessage(chatId, `تم اضافة تذاكر جديدة على الرابط الاتي: ${link}`)
              .then(() => {
                  // console.log('Message sent successfully');
              })
              .catch((error) => {
                // setTimeout(()=>{ bot.sendMessage(chatId, `${dt.title}\n${dt.link}\n${dt.starting_price}\n ${dt.date}`)}, 5000)
              });
            }
  }
  

}




// await browser.close();

app.get('/scrape', (req, res) => {
  if(req.query.link in sites){
  res.send("Already started");
  
}else{
    res.send("started scraping");
    sites[req.query.link] = true;
    scrapeSite(req.query.link).then(result => {
    // scrapeSite("https://queue.platinumlist.net/softblock/?c=platinumlist&e=protectsaudi&t=https%3A%2F%2Fabha.platinumlist.net%2Far%2F&cid=en-US&l=General%20Queue%20Page%20redesign&rticr=0").then(result => {
      }).catch(err => console.log(err));
  }

})
app.get('/', (req, res) => {
    res.set({  'Content-Type': 'application/json',});
    res.send(JSON.stringify(total_data))
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


function delay(time) {
   return new Promise(function(resolve) { 
       setTimeout(resolve, time)
   });
}