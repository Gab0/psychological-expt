#!/bin/python

import os
from openai import OpenAI

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Please set the SUPABASE_URL and SUPABASE_KEY environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Set up OpenAI API key

# Supported languages for the interface
SUPPORTED_LANGUAGES = ["pt-br", "en-us"]


def translate_message(text, target_language):
    """Translate a message using OpenAI API."""
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {
                "role": "system",
                "content": f"You are a translation assistant. "
                f"The user asks you to translate a message to {target_language}. "
                "Please respect the original message formatting: words per line and line breaks. "
                "'XXX' segments in the messages must be preserved. "
                "Try to translate currency symbols such as 'R$' what is appropriated in the target language."
            },
            {
                "role": "user",
                "content": text
            }
        ])
    return response.choices[0].message.content.strip()


def fetch_interface_messages():
    """Fetch all interface messages from Supabase."""
    response = supabase.table('interface_messages').select("*").execute()
    #if response.status_code != 200:
    #    raise Exception(f"Error fetching data: {response.error}")
    return response.data


def add_message(identifier, experiment, language, message):
    """Add a new message translation to the database."""
    new_message = {
        'identifier': identifier,
        'experiment': experiment,
        'language': language,
        'message': message
    }
    response = supabase.table('interface_messages').insert(new_message).execute()
    #if response.status_code != 201:
    #    raise Exception(f"Error inserting data: {response.error}")


def check_and_translate():
    """Check for missing translations and use OpenAI API to translate them."""
    messages = fetch_interface_messages()
    
    # Group messages by identifier and experiment
    grouped_messages = {}
    for msg in messages:
        key = (msg['identifier'], msg['experiment'])
        if key not in grouped_messages:
            grouped_messages[key] = {}
        if not msg['outdated']:
            grouped_messages[key][msg['language']] = msg['message']
    
    for (identifier, experiment), translations in grouped_messages.items():
        for language in SUPPORTED_LANGUAGES:
            if language not in translations:
                # Find an existing translation to use as the source for translation
                available_language, available_message = next(iter(translations.items()))
                print(f"Translating message for identifier: {identifier}, experiment: {experiment} from {available_language} to {language}.")
                translated_message = translate_message(available_message, language)

                print(translated_message)

                add_message(identifier, experiment, language, translated_message)
                print(f"Added translation: {translated_message}")


if __name__ == "__main__":
    check_and_translate()
 
