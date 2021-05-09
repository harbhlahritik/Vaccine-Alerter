This is a simple node script to alert you as soon as vaccine centeres become available on covin

Criteria - available_dose > 1 AND age 18+

To setup - 

make .env file after cloning directory

add these 

PORT=6000
EMAIL=vaccine.alerter.covin@gmail.com OR {Your email which can send mail but should have less secure app access enabled}
PASSWORD=V@ccin3Al3rt3r
RECEIVER_EMAIL={Your Email}
RECEIVER_NAME={Your Name}
RECEIVER_PHONE={Your Phone}
DISTRICT={Your district code}

check district code by checking your state code at -

https://cdn-api.co-vin.in/api/v2/admin/location/states

and district at

https://cdn-api.co-vin.in/api/v2/admin/location/districts/{state_id}

{state_id} will be replaced by your state ID here

Gurgaon - 188
Mumbai - 395

Now install node on your machine

npm i 
In the cloned directory

npm i -g pm2
Get program manager

pm2 start app.js
Starts the node server 

pm2 logs
To check the logs of vaccine tracker


by Hritik Harbhla, contact: harbhlahritik1@gmail.com