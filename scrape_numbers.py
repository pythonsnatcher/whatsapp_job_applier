import requests
from bs4 import BeautifulSoup
import re

keyword = 'builder'


def extract_uk_mobile_numbers_from_page(url):
    # Send a GET request to the specified URL
    response = requests.get(url)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse the content of the webpage
        soup = BeautifulSoup(response.content, 'html.parser')

        # Get all text from the webpage
        text = soup.get_text()

        # Regular expression pattern for UK mobile phone numbers
        # This pattern matches formats like 07123 456 789, 07123456789, 07123-456-789, etc.
        phone_pattern = r'(?:(?:\+44|0)7\d{3}[-\s]?\d{3}[-\s]?\d{3})|(?:(?:\+44|0)7\d{9})'

        # Find all matches in the text
        phone_numbers = re.findall(phone_pattern, text)

        # Remove duplicates and return the list of phone numbers
        return list(set(phone_numbers))
    else:
        print(f"Failed to retrieve the webpage. Status code: {response.status_code}")
        return []

# Base URL without the page number
base_url = f"https://www.thomsonlocal.com/search/{keyword}/london?page="

# Initialize a set to store unique phone numbers
all_phone_numbers = set()

# Loop through pages 1 to 30
for page_number in range(1, 15):
    # Construct the full URL for the current page
    current_url = f"{base_url}{page_number}"
    print(f"Scraping page {page_number}...")  # Optional: Print current page number
    phone_numbers = extract_uk_mobile_numbers_from_page(current_url)

    # Add the found phone numbers to the set
    all_phone_numbers.update(phone_numbers)

# Remove whitespace from phone numbers
cleaned_phone_numbers = {number.replace(" ", "").replace("-", "") for number in all_phone_numbers}

# Save the numbers to a file
if cleaned_phone_numbers:
    with open("numbers.txt", "w") as file:
        for number in cleaned_phone_numbers:
            file.write(number + "\n")  # Write each number on a new line
    print(f"Saved {len(cleaned_phone_numbers)} phone numbers to numbers.txt")
else:
    print("No UK mobile phone numbers found.")
