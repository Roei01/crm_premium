FROM golang:1.21-alpine

WORKDIR /app

# Copy everything first so 'go mod tidy' can see the imports
COPY . .

# Now run tidy to generate go.sum based on the actual code
RUN go mod tidy
RUN go mod download

RUN go build -o main cmd/main.go

EXPOSE 3005

CMD ["./main"]
