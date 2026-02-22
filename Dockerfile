
# Use an official Deno runtime as a parent image
FROM denoland/deno:latest

# Set the working directory in the container
WORKDIR /app

# Create directories for the images
RUN mkdir -p /app/primatourpc && mkdir -p /app/primatourcelular

# Copy the dependencies file and cache them
COPY deno.json .
RUN deno cache main.ts

# Copy the rest of the application files
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the application
CMD ["run", "--allow-net", "--allow-read", "main.ts"]
