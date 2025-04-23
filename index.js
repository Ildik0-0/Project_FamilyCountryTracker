//Version: 1.0.0

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";


const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "admin",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

/*let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];*/

async function checkVisisted(userId) {
  const result = await db.query(
    "SELECT country_code FROM visited_countries WHERE user_id = $1",
    [userId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  const visitedCountries = await checkVisisted(currentUserId);

  try {
    // Fetch the users from your database
    const usersResult = await db.query("SELECT id, name, color FROM users");
    const users = usersResult.rows;

    // Assuming you have a 'users' table to fetch the color based on currentUserId
    const userResult = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId]);
    const userColor = userResult.rows[0]?.color || 'teal';

    res.render("index.ejs", {
      countries: visitedCountries,
      total: visitedCountries.length,
      user_id: currentUserId,
      color: userColor,
      users: users // Pass the users array to the template
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error loading page");
  }
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId] // Use the current user's ID
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  const userId = req.body["user"];

  try {
    const visitedCountries = await checkVisisted(userId);

    // Fetch the specific user's color
    const userResult = await db.query("SELECT color FROM users WHERE id = $1", [userId]);
    const userColor = userResult.rows[0]?.color || 'teal';

    // Fetch the entire users array to re-render the buttons
    const allUsersResult = await db.query("SELECT id, name, color FROM users");
    const allUsers = allUsersResult.rows;

    res.render("index.ejs", {
      countries: visitedCountries,
      total: visitedCountries.length,
      user_id: userId,
      color: userColor,
      users: allUsers // Make sure to pass the users array here!
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).send("Error fetching user data");
  }
});


app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
