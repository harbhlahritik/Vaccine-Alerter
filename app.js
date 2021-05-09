require('dotenv').config()

const express = require('express')
const app = express()
const port = process.env.PORT || 6000
const morgan = require('morgan')
const axios = require('axios')
const cors = require('cors')

app.use(morgan('tiny'))
app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use(cors())

app.listen(port, () => {
	console.log(`Listening at PORT:${port}`)
})

const cron = require('node-cron')

let lastOTPtime = 0;
let lastMailTime = 0;
let lastMailName = "";
let lastMailResultLength = 0;

const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.SENDER_EMAIL,
		pass: process.env.SENDER_PASSWORD
	},
	secure: false
})

const fetchDateString = () => {
	const date = new Date();
	let dateString = '';
	if(date.getDate() < 10) {
		dateString += `0${date.getDate()}-`;
	} else {
		dateString += `${date.getDate()}-`;
	}
	if(date.getMonth()+1 < 10) {
		dateString += `0${date.getMonth()+1}-`;
	} else {
		dateString += `${date.getMonth()+1}-`;
	}
	dateString += `${date.getFullYear()}`;
	return dateString;
}

const getVaccineData = () => {
	axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=188&date=${fetchDateString()}`, {
		"headers": {
			"authority": "cdn-api.co-vin.in",
			"sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
			"accept": "application/json, text/plain, */*",
			"dnt": '1',
			'sec-ch-ua-mobile': '?0',
			'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
			'origin': 'https://www.cowin.gov.in',
			"accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "cross-site",
			"referrer": "https://www.cowin.gov.in/",
		  }
	  })
	.then(response => {
		response = response.data.centers;
		let results = [];
		response.map(center => {
			center.sessions.map(session => {
				if(session.available_capacity > 1 && session.min_age_limit < 45){
					results.push({name: center.name, address: center.address, date: session.date, vaccine: session.vaccine, fee: center.fee_type, pincode: center.pincode, block_name: center.block_name, available_capacity: session.available_capacity})
				}
			})
		})
		console.log(`Vaccine Alerter ran at ${new Date().toLocaleString()} and found ${results.length} eligible centers`)
		if(results.length > 0) {
			if(lastMailResultLength === results.length && lastMailName === results[0].name && (new Date() - lastMailTime) <= 600000) {
				console.log("Same results and last mail was sent less than 10 mins before therefore skipping mail");
				return;
			}
			console.log(`Sending email to ${process.env.RECEIVER_NAME} with all eligible results and OTP to ${process.env.RECEIVER_PHONE} if not sent in past 5 mins`);
			getOtp();
			let html = `<html><head><style>
			table {
				border: 1px solid black;
				text-align: center;
			}
			th {
				border-bottom: 1px solid black;
			}
			</style></head><body><h6>Hi ${process.env.RECEIVER_NAME}! Vaccine Alerter server found some eligible vaccination centers</h6>`;
			html += `<p>Total Centers found: <b>${results.length}</b></p>`;
			html += `<table><thead><th>Name</th><th>Address</th><th>Block</th><th>Pincode</th><th>Date</th><th>Vaccine</th><th>Available</th><th>Fee</th></thead>`
			results.map(center => {
				html += `<tr><td>${center.name}</td><td>${center.address}</td><td>${center.block_name}</td><td>${center.pincode}</td><td>${center.date}</td><td>${center.vaccine}</td><td>${center.available_capacity}</td><td>${center.fee}</td></tr>`
			})
			html += `</table>`;
			html += `<p>Regards,</p>`;
			html += `<p>Your friendly Vaccine Alerter by Hritik</p></body></html>`;
			let mailOptions = {
				from: process.env.SENDER_EMAIL,
				to: process.env.RECEIVER_EMAIL,
				subject: "Vaccine Available Alert Service",
				html
			}
			transporter.sendMail(mailOptions)
			.then(response => {
				console.log(`Successfully sent email to ${process.env.RECEIVER_EMAIL}`)
				lastMailTime = new Date();
				lastMailResultLength = results.length;
				lastMailName = results[0].name;
			})
			.catch(error => {
				console.error(`Unable to send email to ${process.env.RECEIVER_EMAIL}`, error)
			})
		} else {
			lastMailResultLength = 0;
			lastMailTime = 0;
			lastMailName = "";
		}
	})
	.catch(error => {
		console.error("Call to get vaccination center details failed: ", error, error && error.response && error.response.data)
	})
}

const getOtp = () => {
	if((new Date() - lastOTPtime) >= 600000) {
		console.log(`Sending OTP to ${process.env.RECEIVER_NAME} at ${process.env.RECEIVER_PHONE}`)
		axios.post('https://cdn-api.co-vin.in/api/v2/auth/public/generateOTP', {
			"mobile": `${process.env.RECEIVER_PHONE}`
		})
		.then(response => {
			console.log("Successfully genertated OTP: ", response && response.data && response.data.txnId)
			lastOTPtime = new Date();
		})
		.catch(error => {
			console.error("Error occured while generating OTP", error, error && error.response && error.response.data)
		})
	} else {
		console.log("Not triggering OTP as it was sent in the last 10 mins");
	}
}

cron.schedule('*/20 * * * * *', () => {
	console.log("Hitting cowin server ...");
	getVaccineData();
});
