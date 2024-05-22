#!/usr/bin/env node

import pg from 'pg'
const { Client } = pg
import process from 'node:process';
import dotenv from 'dotenv';
import chalk from 'chalk';
import select from '@inquirer/select';
import input from '@inquirer/input';
import checkbox from '@inquirer/checkbox';

dotenv.config();

const client = new Client({
  user: process.env.USER,
  password: process.env.PASSWORD,
  host: process.env.HOST,
  port: process.env.PORT,
  database: process.env.DB,
})

await client.connect()

const table = process.env.TABLE;

const log = console.log;

log(chalk.yellow.bold("\nQuickTodo") + ": Get things done" + chalk.italic(" fast\n"));

while (true) {
  const initialChoice = await select({
    message: 'Your choice:',
    choices: [
      {
        name: 'List all tasks',
        value: 'allTasks',
      },
      {
        name: 'List pending tasks',
        value: 'pendingTasks',
      },
      {
        name: 'List completed tasks',
        value: 'completedTasks',
      },
      {
        name: 'Add new task',
        value: 'addTask',
      },
      {
        name: 'Mark task(s) as complete',
        value: 'completeTask',
      },
      {
        name: 'Delete task(s)',
        value: 'deleteTask',
      },
      {
        name: 'Done for the day',
        value: 'exit',
      },
    ],
  })

  switch (initialChoice) {
    case "addTask":
      log("")
      let todos = [];
      let todoItem = undefined;
      log(chalk.dim("(Leave empty to finish adding)"))

      while (todoItem != '') {
        todoItem = await input({ message: '+' });
        todos.push(todoItem);
      }
      todos.pop()

      for (let it of todos) {
        await client.query(`INSERT INTO ${table} (item) VALUES('${it}')`);
      }
      log("")
      break;
    case "completedTasks":
      log("")
      const completedTasks = await client.query(
        {
          text: `SELECT item FROM ${table} WHERE done=true`,
          rowMode: 'array',
        }
      );
      completedTasks.rows.forEach((it) => {
        log(chalk.strikethrough(it[0]));
      })
      log("")
      break;
    case "pendingTasks":
      log("")
      const pendingTasks = await client.query(
        {
          text: `SELECT item FROM ${table} WHERE done=false`,
          rowMode: 'array',
        }
      );
      pendingTasks.rows.forEach((it) => {
        log(it[0]);
      })
      log("")
      break;
    case "allTasks":
      log("")
      const allTasks = await client.query(
        {
          text: `SELECT item,done FROM ${table}`,
          rowMode: 'array',
        }
      );
      allTasks.rows.forEach((it) => {
        if (!it[1]) log(it[0]);
        else log(chalk.strikethrough(it[0]));
      })
      log("")
      break;
    case "completeTask":
      log("")
      const pendingTasksAgain = await client.query({
        text: `SELECT id,item FROM ${table}`,
      });

      const choicesArr = pendingTasksAgain.rows.map((it) => {
        return {
          name: it.item,
          value: it.id,
        };
      })

      const completed = await checkbox({
        message: 'Mark task(s) as completed',
        choices: choicesArr,
      });

      for (let it of completed) {
        await client.query(`UPDATE ${table} SET done= NOT done WHERE id = ${it}`);
      }
      log("")
      break;
    case "deleteTask":
      log("")
      const allTasksAgain = await client.query({
        text: `SELECT id,item,done FROM ${table}`,
      });

      const choicesArrAgain = allTasksAgain.rows.map((it) => {
        return {
          name: it.item,
          value: it.id,
        };
      })

      const toBeDeleted = await checkbox({
        message: 'Mark task(s) to be deleted',
        choices: choicesArrAgain,
      });

      for (let it of toBeDeleted) {
        await client.query(`DELETE FROM ${table} WHERE id = ${it}`);
      }
      log("")
      break;
    case "exit":
      await client.end()
      log("")
      process.exit()
  }
}
