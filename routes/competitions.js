const express = require("express");
const router = express.Router();
const { authRequired, adminRequired } = require("../services/auth.js");
const Joi = require("joi");
const { db } = require("../services/db.js");

// GET /competitions
router.get("/", authRequired, function (req, res, next) {
    const stmt = db.prepare(`
        SELECT c.id, c.name, c.description, u.name AS author, c.apply_till
        FROM competitions c, users u
        WHERE c.author_id = u.id
        ORDER BY c.apply_till
    `);
    const result = stmt.all();

    res.render("competitions/index", { result: { items: result } });
});

// SCHEMA id
const schema_id = Joi.object({
    id: Joi.number().integer().positive().required()
});

// GET /competitions/delete/:id
router.get("/delete/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("DELETE FROM competitions WHERE id = ?;");
    const deleteResult = stmt.run(req.params.id);

    if (!deleteResult.changes || deleteResult.changes !== 1) {
        throw new Error("Operacija nije uspjela");
    }

    res.redirect("/competitions");
});

// GET /competitions/edit/:id
router.get("/edit/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare("SELECT * FROM competitions WHERE id = ?;");
    const selectResult = stmt.get(req.params.id);

    if (!selectResult) {
        throw new Error("Neispravan poziv");
    }

    res.render("competitions/form", { result: { display_form: true, edit: selectResult } });
});


// SCHEMA edit
const schema_edit = Joi.object({
    id: Joi.number().integer().positive().required(),
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required()
});

// zadatak 2

//GET/competitions/login
router.get("/application/:id", function (req, res, next){
    //do validation
    const result = schema_id.validate(req.params);
    if(result.error){
        throw new Error("Neispravan poziv");
    }
//Je li korisnik upisan
const checkstmt1=db.prepare("SELECT count(*) FROM application WHERE id_user = ? AND id_competitions = ?;");
const checkResult1=checkstmt1.get(req.user.sub, req.params.id);

console.log(checkResult1);

if(checkResult1["count(*)"]>=1) {
    res.render("competitions/form",{result:{database_error:true}});
}
else {
    //Upis u bazu
    const stmt = db.prepare("INSERT INTO application(id_user, id_competitions) VALUES (?, ?);");
    const updateResult = stmt.run(req.user.sub, req.params.id);
    if(updateResult.changes && updateResult.changes === 1) {
        res.render("competitions/form",{result:{success:true}});
    }else{
        res.render("competitions/form",{result:{database_error:true}});
    }
}
});
//ZADATAK 2
//GET/competitions/score_input
router.get("/score_input/:id", adminRequired, function (req, res, next){
    const stmt = db.prepare(`
        SELECT c.id, c.name, c.description, u.name AS CompetitorA, c.apply_till, l.id AS login_id, l.id_user, l.id_competition, l.score
        FROM competitions c, users u, login l
        WHERE c.author_id = u.id AND l.id=?
        ORDER BY c.apply_till
    `);
    const result = stmt.all(req.params.id);
    res.render("competitions/score_input", {result:{items:result}});
});


// SCHEMA score edit
const schema_ScoreEdit = Joi.object({
    id: Joi.number().integer().positive().required(),
    score: Joi.number().min(1).max(50).required()
});

//POST/competitions/score_change
router.post("/score_change", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_ScoreEdit.validate(req.body);

    if (result.error) {
        throw new Error("Neispravan poziv");
        return;
    }

    const stmt = db.prepare("UPDATE login SET score = ? WHERE id = ?;");
    const updateResult = stmt.run(req.body.score, req.body.id);

    if (updateResult.changes && updateResult.changes === 1) {
        res.redirect("/competitions/score_input");
    } else {
        //res.render("competitions/form", { result: { database_error: true } });
    }
});



// GET /competitions/add
router.get("/add", adminRequired, function (req, res, next) {
    res.render("competitions/form", { result: { display_form: true } });
});

// SCHEMA add
const schema_add = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required()
});

// POST /competitions/add
router.post("/add", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_add.validate(req.body);
    if (result.error) {
        res.render("competitions/form", { result: { validation_error: true, display_form: true } });
        return;
    }

    const stmt = db.prepare("INSERT INTO competitions (name, description, author_id, apply_till) VALUES (?, ?, ?, ?);");
    const insertResult = stmt.run(req.body.name, req.body.description, req.user.sub, req.body.apply_till);

    if (insertResult.changes && insertResult.changes === 1) {
        res.render("competitions/form", { result: { success: true } });
    } else {
        res.render("competitions/form", { result: { database_error: true } });
    }
});

module.exports = router;