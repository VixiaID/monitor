import cheerio from 'cheerio';
import express from 'express';
import got from 'got';
import 'dotenv/config.js';

const scrape = (type) => {
  let url;
  if (type == 'hax') {
    url = "https://hax.co.id/create-vps/";
  } else if (type == 'woiden') {
    url = "https://woiden.id/create-vps/";
  }
  const headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  };
  return new Promise(async(resolve, reject) => {
    const res = await got(url, { headers });
    const $ = cheerio.load(res.body);
    const el = $('#datacenter option:not(:first-child)');
    const data = el.map((i, el) => $(el).text()).get();
    resolve(data)
  })
}

const checkDC = async(type) => {
  let name;
  if (type == 'hax') {
    name = 'Hax'
  } else if (type == 'woiden') {
    name = 'Woiden'
  }
  tg(`Memulai Monitor === Waktu: ${new Date}`)
  let list = [];
  let empty = false;
  while(true) {
    let dc = await scrape(type);
    if (dc.length > 0) {
      if (JSON.stringify(list) == JSON.stringify(dc)) {
        continue
      } else {
        let str = dc.join('\n');
        tg(`${name} tersedia === Waktu: ${new Date()}\n${str}`);
        list = dc;
        empty = false;
      }
    } else {
      const nullList = {};
      if (JSON.stringify(list) != JSON.stringify(nullList) && !empty) {
        tg(`${name} telah habis === Waktu: ${new Date}`);
        list = [];
        empty = true;
      }
    }
  }
}

const tg = async(msg) => {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
  let chatIds = [];
  try {
    const res = await got(`${url}/getUpdates?offset=0&limit=100`);
    const updates = JSON.parse(res.body);
    for (const update of updates.result) {
      if ('message' in update) {
        chatIds.push(update.message.chat.id);
      } else if ('my_chat_member' in update) {
        chatIds.push(update.my_chat_member.chat.id);
      } else {
        console.log('User lookup exception');
      }
    }
    
    for (const chatId of Array.from(new Set(chatIds))) {
      const data = {
        'chat_id': chatId,
        'text': msg
      }
      const res = await got.post(`${url}/sendMessage`, { json: data });
      if (res.statusCode == 200) {
        console.log(res.body);
      }
    }
  } catch(error) {
    console.log(error);
  }
}

const onlyOn = () => {
  const app = express();
  app.get('/', (req, res) => {
    res.send('Running');
  })
  app.listen(process.env.PORT || 3000, () => console.log('Web running'))
}

 const signalHandler = () => {
   console.log('Program dihentikan');
   process.exit(0);
 }
 
const threadCheck = () => {
  if (process.env.BOT_TOKEN == null) {
    console.log('Bot token not set');
    return signalHandler;
  }
  process.on('SIGINT', signalHandler);
  onlyOn();
  
  Promise.all([checkDC('hax'), checkDC('woiden')])
  .then(() => {
    console.log('Thread selesai');
  })
  .catch((error) => console.log(error));
}

threadCheck();