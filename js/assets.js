window.BuahWira=window.BuahWira||{};
BuahWira.Assets={
 fruitNames:['watermelon','mango','dragonfruit','mangosteen','orange','papaya'],images:{},
 preload(){const paths=[];for(const n of this.fruitNames)for(const part of ['whole','left','right','splash'])paths.push(`./assets/images/fruits/${n}-${part}.png`);paths.push('./assets/images/backgrounds/bg-home.png');return Promise.all(paths.map(path=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{this.images[path]=image;resolve()};image.onerror=()=>reject(new Error(path));image.src=path})))},
 getFruit(name,part='whole'){return this.images[`./assets/images/fruits/${name}-${part}.png`]}
};
