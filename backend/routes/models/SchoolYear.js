// New file: models/SchoolYear.js
const mongoose = require('mongoose');

const schoolYearSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  terms: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  }
});

// Force collection name to 'year'
module.exports = mongoose.model('Year', schoolYearSchema, 'year');