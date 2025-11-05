// File: data/InternshipFeeData.js
// Exporting default dataset to seed into DB. Prices are numbers in rupees and rawPriceString keeps the display format.
module.exports = [
  {
    duration: "1 Month",
    price: 199,
    currency: "INR",
    popular: false,
    rawPriceString: "₹199",
  },
  {
    duration: "2 Months",
    price: 299,
    currency: "INR",
    popular: false,
    rawPriceString: "₹299",
  },
  {
    duration: "3 Months",
    price: 399,
    currency: "INR",
    popular: true,
    rawPriceString: "₹399",
  },
  {
    duration: "6 Months",
    price: 599,
    currency: "INR",
    popular: false,
    rawPriceString: "₹599",
  },
  // Add more durations below if you want
  {
    duration: "9 Months",
    price: 899,
    currency: "INR",
    popular: false,
    rawPriceString: "₹899",
  },
  {
    duration: "12 Months",
    price: 1199,
    currency: "INR",
    popular: false,
    rawPriceString: "₹1199",
  },
];
