#!/bin/bash

# Start backend
cd BackEnd
npm install
npm run dev 

# Start frontend
cd ../client
npm install
npm run dev     # build React

