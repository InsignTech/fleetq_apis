import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

var Schema = mongoose.Schema
 var userSchema = new Schema({
    userName:{
        type:String,
        required:true, 
       },
       phoneNumber:{
        type:Number,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    }
 })
 userSchema.pre("save",async function(next){
    if(!this.isModified("password")){
        next()
    }
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password,salt)
    })
    userSchema.methods.matchPassword = async function(enteredPassword){
        return await bcrypt.compare(enteredPassword,this.password)
    }

const User = mongoose.model("User",userSchema)
export default User

