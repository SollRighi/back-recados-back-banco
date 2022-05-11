import express, { response } from "express";
import { send } from "process";
import "reflect-metadata";
import { Connection, createConnection } from "typeorm";
import { CadastroUsuario } from "./CadastroUsuario";
import { Recado } from "./Recado";
//import ListaRecados, {Recado} from "./listarecados";
import cors from "cors";
import { json } from "stream/consumers";
import Redis from "ioredis";

createConnection({
    type:'postgres',
    host: 'ec2-18-210-64-223.compute-1.amazonaws.com',
    port: 5432,
    username: "oqxkjyqmolgtwn",
    password: "b84886951bbde52c81158f7d3b33d517061441f539e390e1fdbc5ed679e4e3b8",
    database: "d8bhafcinn5k3o",
    //url: 'postgres://oqxkjyqmolgtwn:b84886951bbde52c81158f7d3b33d517061441f539e390e1fdbc5ed679e4e3b8@ec2-18-210-64-223.compute-1.amazonaws.com:5432/d8bhafcinn5k3o',
    entities: [CadastroUsuario,Recado],
    synchronize: true,
    logging: true,
    extra: {
         ssl: {
            "rejectUnauthorized": false
          }
    }

    }).then (connection => {
    console.log("conectou no banco de dados")
}).catch(error => console.log(error));

const redisClient = new Redis({
    host: 'redis-12238.c81.us-east-1-2.ec2.cloud.redislabs.com',
    port: 12238,
    password: 'rx1NIfj9NUrY99nK3VfDdKItZ5Tj4ocX'
})

const app = express(); //armazenando em uma variavel
app.use(express.json()); //informando que eu so aceito as informações em json
app.use(cors());

const PORT = 8000;

app.get("/", async (req, res) => {
    res.send('Servidor rodando')
})

app.post("/cadastro", async (req, res) => {
    console.log(req.body)
    const nome = req.body.nome;
    const senha = req.body.senha;

    if (!nome || !senha){
        res.status(400).send("Insira todos os dados solicitados.")
        return
    }
    
    const registroUsuario = new CadastroUsuario();
    registroUsuario.nome = nome;
    registroUsuario.senha = senha;

    try {
        await registroUsuario.save()
    }catch (e) {
        res.status(400).send("Ocorreu um erro ao salvar")
        return
    }

    res.send("O usuario foi salvo");
})

app.post("/login", async (req, res) => {

    let nome = req.body.nome
    let senha = req.body.senha

    if (!nome || !senha) {
        res.status(400).send("Insira todos os dados solicitados.")
        return

    } else {
        
        let usuario = await CadastroUsuario.findOne({ where: { nome: nome, senha: senha } });

        if (usuario == undefined) {
            res.status(400).send("Usuario ou senha inválida");
            return

        } else {
            res.send({
                usuario
            })
        }
    }

})

app.post("/recado", async (req, res) => {

    let idUsuario = req.body.usuario
    let descricao = req.body.descricao
    let detalhamento = req.body.detalhamento

    if (!descricao || !detalhamento) {
        res.status(400).send("Insira todos os dados solicitados.")
        return
    }

    const registroRecado = new Recado();
    registroRecado.idUsuario = idUsuario
    registroRecado.descricao = descricao
    registroRecado.detalhamento = detalhamento

    try {
        await registroRecado.save();
        const recados = await Recado.find({ where: { idUsuario: idUsuario } });
        await redisClient.set(`recados-usuario-${idUsuario}`, JSON.stringify(recados))
    } catch (e) {
        res.status(400).send("Ocorreu um erro ao salvar")
        return
    }

    res.send ("O Recado foi salvo!")

})

app.get("/listarecados/:idUsuario", async (req, res) => {
    
    let idUsuario = req.params.idUsuario

    let recados
    let recadosRedis = await redisClient.get(`recados-usuario-${idUsuario}`)
    if (recadosRedis) {
        recados = JSON.parse(recadosRedis)
    } else {
        recados = await Recado.find({ where: { idUsuario: idUsuario } });
        await redisClient.set(`recados-usuario-${idUsuario}`, JSON.stringify(recados))
    }

    res.send(recados);
})

app.delete("/recado/:idRecado", async (req, res) => {
    let idRecado = req.params.idRecado
    let recadoDeletar = await Recado.findOne({ where: { id: idRecado } });
    let idUsuario = recadoDeletar.idUsuario

    await recadoDeletar.remove()

    const recados = await Recado.find({ where: { idUsuario: idUsuario } });
    await redisClient.set(`recados-usuario-${idUsuario}`, JSON.stringify(recados))
    
    res.send("Recado Excluído");
})

app.put("/recado/:idRecado", async (req, res) => {
    let idRecado = req.params.idRecado
    let novaDescricao = req.body.descricao
    let novoDetalhamento = req.body.detalhamento

    let recadoNovo = await Recado.findOne({ where: { id: idRecado } });
    
    recadoNovo.descricao = novaDescricao
    recadoNovo.detalhamento = novoDetalhamento

    try {
        await recadoNovo.save();
        const recados = await Recado.find({ where: { idUsuario: recadoNovo.idUsuario } });
        await redisClient.set(`recados-usuario-${recadoNovo.idUsuario}`, JSON.stringify(recados))
    } catch (e) {
        res.status(400).send("Ocorreu um erro ao salvar seu recado")
        return
    }

    res.send("Recado atualizado")
})






















app.listen(process.env.PORT || PORT, () => {
    console.log(`server rodando`);
});
