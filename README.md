## Running a database

To start a local PostGRES database, run the following command:

```sh
docker run --name postgres -p 5432:5432 -e  POSTGRES_HOST_AUTH_METHOD=password -e POSTGRES_PASSWORD=password -d postgres
```# graphql-dataloaders
