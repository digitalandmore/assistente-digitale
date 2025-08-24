import { Schema, model } from 'mongoose';
const intentSchema = new Schema({
    
})
const intentPormpt = new Schema({

    id: { type: String, required: true }, 
    assistantName: { type: String, required: true },
    category: { type: String, required: true },      
    intent: { type: String, required: true },           
    wantsConsultation: { type: Boolean, default: false }, 
    confidence: {tyoe:Number, require: true},    // 0.0 a 1.0
    createdAt: {type: Date, default: Date.now},         
    updatedAt: {type: Date, default: Date.now}      
});