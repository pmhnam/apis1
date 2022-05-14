const ConversationModel = require('../models/chats/conversation.model');
const MessageModel = require('../models/chats/message.model');



// fn: danh sách cuộc trò chuyện
const getConversations = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, pending = false } = req.query
        const { user } = req
        var conversations = null
        if (pending) {
            // lấy danh sách hội thoại đang chờ kết nối
            conversations = await ConversationModel.aggregate([
                { $match: { pending: user._id } },
                {
                    $lookup: {
                        from: 'messages',
                        as: "messages",
                        let: { localId: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$$localId', '$conversation'] } } },
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 }
                        ]
                    }
                },
                { $sort: { recentAt: -1 } },
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) }
            ])
        } else {
            // lấy danh sách hội đã kết nối thoại kèm 1 tin nhắn gần nhất
            conversations = await ConversationModel.aggregate([
                { $match: { members: { $in: [user._id] } } },
                {
                    $lookup: {
                        from: 'messages',
                        as: "messages",
                        let: { localId: '$_id' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$$localId', '$conversation'] } } },
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 }
                        ]
                    }
                },
                { $sort: { recentAt: -1 } },
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) }
            ])
        }
        res.status(200).json({ message: "ok", conversations })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error" })
    }
}


// fn: gửi kết nối hội thoại
/** Note:
 kiểm tra 2 user đã connect vs nhau chưa. 
     nếu rồi thì tạo message
     nếu chưa thì kiểm tra có tin nhắn chờ hay không?
         nếu không có tn chờ => tạo tn chờ
         nếu có tn chờ thì check ai là người req kết nối, ai là người đc req kết nối
             nếu người gửi là người req kết nối => tạo message 
             nếu người gửi là người đc req kết nối => accept connect => tạo message
tóm lại luôn tạo message
*/
const postConversation = async (req, res, next) => {
    try {
        const { user } = req
        // userId là đối tượng muốn kết nối hội thoại
        const { userId, text } = req.body
        let conversation = null
        let message = "Gửi tin nhắn thành công. Đã kết nối hội thoại"
        // kiểm tra 2 user đã connect với nhau chưa? gửi tn : check tin nhắn chờ ? connect: tạo tn chờ 
        let hadConversation = await ConversationModel.findOne({ members: { $all: [user._id, userId] } })
        if (!hadConversation) {
            // check tin nhắn chờ
            const pendingConversation = await ConversationModel.findOne({
                $or: [
                    { members: { $in: [user._id] }, pending: userId },
                    { members: { $in: [userId] }, pending: user._id },
                ]
            }).lean()

            if (pendingConversation) {
                // user là người đc yêu cầu kết nối
                if (pendingConversation.pending == user._id) {
                    // đánh dấu đã xem
                    let seenAt = new Date()
                    await MessageModel.updateMany({ conversation: pendingConversation._id }, { seen: true, seenAt })
                    // chấp nhận kết nối
                    await ConversationModel.updateOne(
                        { _id: pendingConversation._id },
                        {
                            $push: { members: pendingConversation.pending },
                            pending: null
                        })
                }
                conversation = pendingConversation._id
                message = "Gửi thành công, đã chấp nhận kết nối"
            } else {
                // tạo hội thoại
                const cvst = await ConversationModel.create({ members: [user._id], pending: userId })
                conversation = cvst._id
                message = "Gửi thành công, chờ chấp nhận kết nối"
            }
        } else {
            conversation = hadConversation._id
        }
        // tạo message
        await MessageModel.create({ conversation, sender: user._id, receiver: userId, text: text.trim() })
        // cập nhật recent => sort conversation
        res.status(201).json({ message })
        let recentAt = new Date()
        await ConversationModel.updateOne({ _id: conversation }, { recentAt })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'error' })
    }
}

// fn: chấp nhận kết nối hội thoại
/**
 * 
 */
const postAcceptConversation = async (req, res, next) => {
    try {
        const { conversation, text } = req.body
        const { user } = req
        let message = "Gửi tin nhắn thành công"
        // lấy hội thoại
        const cvst = await ConversationModel.findById(conversation)
        if (!cvst) return res.status(400).json({ message: "Mã hội thoại không tồn tại" })
        // cập nhật tin nhắn seen = true
        let seenAt = new Date()
        await MessageModel.updateMany({ conversation }, { seen: true, seenAt })
        // tạo tin nhắn
        await MessageModel.create({ conversation, sender: user._id, text: text.trim() })
        // cập nhật hội thoại
        if (JSON.stringify(cvst.pending) == JSON.stringify(user._id)) {
            let recentAt = new Date()
            await ConversationModel.updateOne({ _id: conversation }, { $push: { members: user._id }, pending: null, recentAt })
            message = "Gửi tin nhắn thành công, đã chấp nhận hội thoại"
        }
        res.status(200).json({ message })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'error' })
    }
}

/**
 * Gửi tin nhắn
 */
const postMessage = async (req, res, next) => {
    try {
        const { conversation, text } = req.body
        const { user } = req
        // kiểm tra hội thoại
        const cvst = await ConversationModel.findById(conversation)
        if (!cvst) return res.status(400).json({ message: "invalid conversation id " })
        // tạo tin nhắn
        await MessageModel.create({ conversation, text: text.trim(), sender: user._id })
        res.status(201).json({ message: "ok" })
        // cập nhật hội thoại
        let recentAt = new Date()
        await ConversationModel.updateOne({ _id: conversation }, { recentAt })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error" })
    }
}


// fn: lấy danh sách tin nhắn của 1 hội thoại
const getMessages = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query
        const { conversation } = req.params

        const messages = await MessageModel.find({ conversation }).populate('sender', '_id avatar fullName')
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
        res.status(200).json({ message: "ok", messages })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error" })
    }
}

// fn: cập nhật thành đã xem tin nhắn
// Note: chỉ cập nhật khi đã kết nối
const updateSeenMessage = async (req, res, next) => {
    try {
        const { conversation } = req.params
        const { user } = req
        let seenAt = new Date()
        // lấy hội thoại
        const cvst = await ConversationModel.findById(conversation).lean()
        if (!cvst) return res.status(400).json({ message: "Mã hội thoại không hợp lệ" })
        let sender = cvst.members[0] === user._id ? cvst.members[1] : cvst.members[0]
        // cập nhật tin nhắn thành đã xem
        await MessageModel.updateMany({ conversation: cvst._id, sender, seen: false }, { seen: true, seenAt })
        res.status(200).json({ message: "update ok" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error" })
    }
}


module.exports = {
    getConversations,
    postConversation,
    postAcceptConversation,
    postMessage,
    getMessages,
    updateSeenMessage
}