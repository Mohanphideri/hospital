import mongoose from 'mongoose';

const querySchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'closed'],
      default: 'pending',
    },
    
    
    assignedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: Date,
    
    
    reply: String,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    repliedAt: Date,
    
    
    messages: [
      {
        text: { type: String, required: true },
        
        senderModel: { type: String, enum: ['Patient', 'User'], required: true },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'messages.senderModel',
          required: true,
        },
        senderName: String,
        senderRole: String, 
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Query', querySchema);
