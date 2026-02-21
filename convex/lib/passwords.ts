// Top 100 most common passwords — reject these regardless of length
const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
  "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
  "ashley", "michael", "shadow", "123123", "654321", "superman", "qazwsx",
  "football", "password1", "password123", "batman", "login",
  "princess", "starwars", "solo", "welcome", "admin", "passw0rd", "hello",
  "charlie", "donald", "qwerty123", "mustang", "access", "flower", "696969",
  "hottie", "loveme", "pepper", "simple", "welcome1", "robert", "heroes",
  "amazing", "genius", "dragon1", "1qaz2wsx", "123456789", "1234567890",
  "qwertyuiop", "12345", "password1234", "1q2w3e4r", "123qwe", "zaq12wsx",
  "1q2w3e", "abcdef", "abcdefg", "121212", "111111", "000000", "112233",
  "changeme", "letmein1", "test", "guest", "master1", "changeit",
  "baseball1", "football1", "shadow1", "monkey1",
  "jordan", "thomas", "summer", "george", "harley", "ginger", "joshua",
  "whatever", "cheese", "computer", "internet", "soccer", "hockey", "killer",
  "chicken", "george1", "matrix", "yankees", "ranger", "cowboy", "phoenix",
  "diablo", "banana", "andrea", "prince", "melissa",
]);

export function validatePassword(password: string): void {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters");
  }
  if (password.length > 128) {
    throw new Error("Password must be no more than 128 characters");
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new Error(
      "This password is too common. Please choose a more unique password.",
    );
  }
}
