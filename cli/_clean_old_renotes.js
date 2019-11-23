"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_1 = require("../models/user");
const note_1 = require("../models/note");
const mongodb_1 = require("mongodb");
const favorite_1 = require("../models/favorite");
const array_1 = require("../prelude/array");
async function main() {
    const id = new mongodb_1.ObjectID('700000000000000000000000');
    // favs
    const favs = await favorite_1.default.find({
        noteId: { $lt: id }
    });
    // remote users
    const users = await user_1.default.find({
        host: { $ne: null },
    }, {
        fields: {
            _id: true
        }
    });
    let prs = 0;
    for (const u of users) {
        prs++;
        const user = await user_1.default.findOne({
            _id: u._id
        });
        console.log(`user(${prs}/${users.length}): ${user.username}@${user.host}`);
        const exIds = array_1.concat([
            favs.map(x => x.noteId),
            (user.pinnedNoteIds || [])
        ]);
        const notes = await note_1.default.find({
            $and: [
                {
                    userId: user._id
                },
                {
                    _id: { $nin: exIds }
                },
                {
                    _id: { $lt: id }
                },
                {
                    $or: [
                        { renoteCount: { $exists: false } },
                        { renoteCount: 0 },
                    ],
                },
                {
                    repliesCount: { $exists: false }
                },
                {
                    reactionCounts: { $exists: false }
                },
                {
                    replyId: null,
                },
                {
                    renoteId: { $ne: null },
								},
								{
									text: null,
								}
            ],
        });
        for (const note of notes) {
            console.log(`${note._id}`);
            await note_1.default.update({ _id: note.renoteId }, {
                $inc: {
                    renoteCount: -1
                }
            });
            await note_1.default.remove({ _id: note._id });
        }
    }
}
main().then(() => {
    console.log('Done');
});
