const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); // Allows the frontend to talk to this backend

const PORT = 3000;

const API_KEY = '49YH98VDH11QPVSH'; 

// The Endpoint: http://localhost:3000/api/normalize?symbol=AAPL
app.get('/api/normalize', async (req, res) => {
    const symbol = req.query.symbol; 

    if (!symbol) {
        return res.status(400).json({ error: 'Please provide a stock symbol' });
    }

    console.log(`Fetching data for: ${symbol}...`); 

    try {
        // 1. Fetch Raw Data from Alpha Vantage
        const response = await axios.get(`https://www.alphavantage.co/query`, {
            params: {
                function: 'TIME_SERIES_DAILY',
                symbol: symbol,
                outputsize: 'full',
                apikey: API_KEY
            }
        });

        const rawData = response.data['Time Series (Daily)'];

        if (!rawData) {
            console.error("API Error:", response.data);
            return res.status(500).json({ error: 'Error fetching data. Check your API limit or symbol.' });
        }

        // 2. Process the Data 
        let formattedData = Object.keys(rawData).map(date => {
            return {
                date: date,
                close: parseFloat(rawData[date]['4. close']) 
            };
        });

        // Sort by date (Oldest first)
        formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Get only the last 1 year (approx 250 trading days)
        const oneYearData = formattedData.slice(-250); 

        // 3. Normalize to 100
        if (oneYearData.length > 0) {
            const basePrice = oneYearData[0].close; 

            const normalizedData = oneYearData.map(day => {
                return {
                    date: day.date,
                    originalPrice: day.close,
                    normalizedPrice: (day.close / basePrice) * 100 
                };
            });

            res.json({
                symbol: symbol,
                basePrice: basePrice,
                data: normalizedData
            });
        } else {
            res.status(500).json({ error: 'Not enough data found to calculate.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});