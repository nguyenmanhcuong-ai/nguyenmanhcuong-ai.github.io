// models/moment.js
import { Sequelize, DataTypes } from 'sequelize';
import sequelize from '../config/database'; // Make sure the path is correct

const Moment = sequelize.define('Moment', {
  urlpicture: DataTypes.STRING,
  date: DataTypes.DATE,
  location: DataTypes.STRING,
  occasion: DataTypes.STRING,
  description: DataTypes.STRING,
});

export default Moment;
