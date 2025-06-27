import json
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal
import uuid
import traceback
import os
import base64
from botocore.exceptions import ClientError
from botocore.config import Config
from urllib.parse import urlparse
import time

# Setup
s3 = boto3.client(
    's3',
    region_name=os.environ['REGION_NAME'],
    config=Config(signature_version='s3v4')
)
bucket_name = os.environ['S3_BUCKET_NAME']

dynamodb = boto3.resource("dynamodb")
posts_table = dynamodb.Table(os.environ['POSTS_TABLE_NAME'])
users_table = dynamodb.Table(os.environ['USERS_TABLE_NAME'])
follows_table = dynamodb.Table(os.environ['FOLLOWS_TABLE_NAME'])
projects_table = dynamodb.Table(os.environ['PROJECTS_TABLE_NAME'])


# Helpers
def get_user_claims(event):
    try:
        return event["requestContext"]["authorizer"]["jwt"]["claims"]
    except KeyError:
        return {}

def decimal_to_native(obj):
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj

def upload_image_to_s3(base64_str, post_id):
    try:
        if ',' in base64_str:
            base64_str = base64_str.split(",")[1]
        image_bytes = base64.b64decode(base64_str)
        key = f"posts/{post_id}.jpg"

        s3.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=image_bytes,
            ContentType='image/jpeg',
            ACL='public-read'
        )
        public_url = f"https://{bucket_name}.s3.{s3.meta.region_name}.amazonaws.com/{key}"
        print(f"Uploaded image to {public_url}")
        return public_url
    except Exception as e:
        print(f"Error uploading image: {e}")
        raise

# Entry point
def lambda_handler(event, context):
    
    method = event.get("requestContext", {}).get("http", {}).get("method")
    path = event.get("rawPath")
    qs = event.get("queryStringParameters") or {}
    print("🧭 Routing", method, path, event.get("queryStringParameters"))

    print("Received event:")
    print(json.dumps(event, indent=2))

    # Posts routes
    if path == "/":
        if method == "OPTIONS":
            return handle_options(event)
        if method == "GET" and "id" in qs:
            return handle_get_post_by_id(event)
        if method == "GET" and "presign" in qs:
            return handle_presign(event)
        if method == "GET":
            return handle_get(event)
        if method == "POST":
            return handle_post(event)
        if method == "PUT":
            return handle_put(event)
        if method == "DELETE":
            return handle_delete(event)
        return cors_response(405, {"error": "Method Not Allowed"})

    # User profile routes
    if path == "/user-meta":
        if method == "OPTIONS":
            return handle_options(event)
        if method == "POST":
            return handle_user_meta_post(event)
        if method == "GET":
            return handle_user_meta_get(event)
        if method == "PUT":
            return handle_user_meta_put(event)
        return cors_response(405, {"error": "Method Not Allowed"})
    
    if path == "/follow":
        if method == "OPTIONS":
            return handle_options(event)
        if method == "POST":
            return handle_toggle_follow(event)
        return cors_response(405, {"error": "Method Not Allowed"})

    if path == "/following":
        if method == "OPTIONS":
            return handle_options(event)
        if method == "GET":
            return handle_get_following(event)
        return cors_response(405, {"error": "Method Not Allowed"})
    
    if path == "/project":
        if method == "OPTIONS":
            return handle_options(event)
        if method == "POST":
            return handle_project_post(event)
        if method == "GET":
            return handle_project_get(event)
        if method == "PUT":
            return handle_project_put(event)
        if method == "DELETE":
            return handle_project_delete(event)
        return cors_response(405, {"error": "Method Not Allowed"})

    if path == "/projects":
        if method == "OPTIONS":
            return handle_options(event)
        if method == "GET":
            return handle_projects_list(event)
        return cors_response(405, {"error": "Method Not Allowed"})


    return cors_response(404, {"message": "Not Found"})

# Handlers
def handle_options(event):
    return cors_response(200, {"message": "CORS preflight successful"})

def handle_get(event):
    try:
        qs = event.get("queryStringParameters") or {}
        project_id = qs.get("projectId")

        if project_id:
            # Query using the GSI
            resp = posts_table.query(
                IndexName="projectId-index",
                KeyConditionExpression=Key("projectId").eq(project_id)
            )
            items = decimal_to_native(resp.get("Items", []))
            return cors_response(200, items)
        else:
            # Fallback: return all posts (or consider limiting this)
            resp = posts_table.scan()
            items = decimal_to_native(resp.get("Items", []))
            return cors_response(200, items)

    except Exception as e:
        return cors_response(500, {
            "error": str(e),
            "traceback": traceback.format_exc()
        })

    
def handle_get_post_by_id(event):
    try:
        post_id = event.get("queryStringParameters", {}).get("id")
        if not post_id:
            return cors_response(400, {"error": "Missing post ID"})

        response = posts_table.get_item(Key={"id": post_id})
        item = response.get("Item")
        if not item:
            return cors_response(404, {"error": "Post not found"})

        return cors_response(200, decimal_to_native(item))
    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})


def handle_presign(event):
    print('hi')
    try:
        claims = get_user_claims(event)
        user_sub = claims.get("sub", "anonymous")
        qs = event.get("queryStringParameters") or {}
        post_id = qs.get("post_id")
        index = qs.get("index", "0")

        if not post_id:
            return cors_response(400, {"error": "Missing post_id"})
        
        key = f"posts/{post_id}_{index}.jpg"

        url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": bucket_name,
                "Key": key,
                # "ACL": "public-read", 
            },
            ExpiresIn=300
        )

        public_url = f"https://{bucket_name}.s3.{s3.meta.region_name}.amazonaws.com/{key}"
        return cors_response(200, {"upload_url": url, "public_url": public_url})
    except Exception as e:
        print("❌ Error in handle_presign:", str(e))
        return cors_response(500, {
            "error": str(e),
            "traceback": traceback.format_exc()
        })

def handle_post(event):
    try:
        claims = get_user_claims(event)
        user_sub = claims.get("sub")
        user_name = claims.get("cognito:username")

        body = json.loads(event.get("body", "{}"))
        for field in ["title", "content", "timestamp"]:
            if field not in body:
                return cors_response(400, {"error": f"Missing field: {field}"})

        post_id = str(uuid.uuid4())
        post_item = {
            "id": post_id,
            "userId": user_sub,
            "username": user_name,
            "title": body.get("title"),
            "content": body.get("content"),
            "tag": body.get("tag", "general"),
            "visibility": body.get("visibility", "public"),
            "timestamp": body.get("timestamp"),
            "images": body.get("images", []),
            "layout": body.get("layout", "grid"),
            "pageOwnerId": body.get("pageOwnerId", user_sub),
            "projectId": body.get("projectId")
        }

        posts_table.put_item(Item=post_item)
        return cors_response(200, {"message": "Post saved successfully", "id": post_id})
    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})

def handle_delete(event):
    try:
        claims = get_user_claims(event)
        user_sub = claims.get("sub")
        post_id = (event.get("queryStringParameters") or {}).get("id")
        if not post_id:
            return cors_response(400, {"error": "Missing 'id'"})

        resp = posts_table.get_item(Key={"id": post_id})
        item = resp.get("Item")
        if not item:
            return cors_response(404, {"error": "Post not found"})

        if user_sub != item.get("userId") and user_sub != item.get("pageOwnerId"):
            return cors_response(403, {"error": "Not authorized to delete this post"})

        for url in item.get("images", []):
            key = urlparse(url).path.lstrip('/')
            try:
                s3.delete_object(Bucket=bucket_name, Key=key)
            except Exception as e:
                print(f"Error deleting image: {e}")

        posts_table.delete_item(Key={"id": post_id})
        return cors_response(200, {"message": f"Post {post_id} deleted"})
    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})

def handle_put(event):
    try:
        claims = get_user_claims(event)
        user_sub = claims.get("sub")
        body = json.loads(event.get("body", "{}"))
        post_id = body.get("id")
        if not post_id:
            return cors_response(400, {"error": "Missing post ID"})

        resp = posts_table.get_item(Key={"id": post_id})
        item = resp.get("Item")
        if not item:
            return cors_response(404, {"error": "Post not found"})
        if item.get("userId") != user_sub:
            return cors_response(403, {"error": "Not your post"})

        new_images = body.get("images", [])
        existing_images = item.get("images", [])
        if new_images and new_images != existing_images:
            for url in existing_images:
                key = urlparse(url).path.lstrip('/')
                try:
                    s3.delete_object(Bucket=bucket_name, Key=key)
                except:
                    pass

        allowed_fields = ["title", "content", "tag", "images", "layout", "timestamp", "projectId"]
        updated_data = {k: body.get(k) for k in allowed_fields}
        updated_data.update({
            "id": post_id,
            "userId": user_sub,
            "user_name": claims.get("username"),
            "images": new_images if new_images else existing_images
        })

        update_expression = "SET " + ", ".join(f"#{k} = :{k}" for k in updated_data if k != "id")
        expression_attr_names = {f"#{k}": k for k in updated_data if k != "id"}
        expression_attr_values = {f":{k}": v for k, v in updated_data.items() if k != "id"}

        posts_table.update_item(
            Key={"id": post_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attr_names,
            ExpressionAttributeValues=expression_attr_values
        )
        return cors_response(200, {"message": "Post updated"})
    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})

def handle_user_meta_post(event):
    try:
        claims = get_user_claims(event)
        user_id = claims.get("sub")
        username = claims.get("cognito:username")

        body = json.loads(event.get("body", "{}"))

        item = {
            "id": user_id,
            "username": username,
            "post_css": body.get("post_css", ""),
            "layout_css": body.get("layout_css", ""),
            "default_layout": body.get("default_layout", "columns"),
            "background_url": body.get("background_url", ""),
            "tags": body.get("tags", []),
            "default_tag": body.get("default_post_tag", "general"),
            "created_at": body.get("created_at") or int(time.time() * 1000)  # fallback if frontend omits it
        }

        users_table.put_item(Item=item)
        return cors_response(200, {"message": "User profile created"})
    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})


def handle_user_meta_get(event):
    try:
        qs = event.get("queryStringParameters") or {}
        user_id = qs.get("id")
        username = qs.get("username")

        if user_id:
            resp = users_table.get_item(Key={"id": user_id})
            item = resp.get("Item")
        elif username:
            resp = users_table.query(
                IndexName="username-index",  # ✅ name of your GSI
                KeyConditionExpression=Key("username").eq(username)
            )
            items = resp.get("Items", [])
            item = items[0] if items else None
        else:
            return cors_response(400, {"error": "Missing id or username"})

        if not item:
            return cors_response(404, {"error": "User not found"})

        return cors_response(200, decimal_to_native(item))
    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})

    
def handle_user_meta_put(event):
    try:
        claims = get_user_claims(event)
        user_id = claims.get("sub")
        body = json.loads(event.get("body", "{}"))

        allowed_fields = ["post_css", "layout_css", "default_layout", "background_url", "tags", "default_tag"]
        update_fields = {k: v for k, v in body.items() if k in allowed_fields}

        if not update_fields:
            return cors_response(400, {"error": "No valid fields to update"})

        # Handle background staging logic
        bg_url = update_fields.get("background_url", "")
        print('hi')
        if bg_url and "_staged_" in bg_url:
            staged_key = f"posts/bg_{user_id}_staged_0.jpg"
            final_key = f"posts/bg_{user_id}_final.jpg"
            print(staged_key, final_key)
            s3.copy_object(
                Bucket=bucket_name,
                CopySource=f"{bucket_name}/{staged_key}",
                Key=final_key,
                ACL="public-read",
                ContentType="image/jpeg",
            )
            update_fields["background_url"] = f"https://{bucket_name}.s3.{s3.meta.region_name}.amazonaws.com/{final_key}"

        update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in update_fields)
        expr_names = {f"#{k}": k for k in update_fields}
        expr_values = {f":{k}": v for k, v in update_fields.items()}

        users_table.update_item(
            Key={"id": user_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values
        )

        return cors_response(200, {"message": "User profile updated"})

    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})

def handle_toggle_follow(event):
    try:
        claims = get_user_claims(event)
        follower_id = claims.get("sub")
        body = json.loads(event.get("body", "{}"))
        followed_id = body.get("followed_id")

        if not followed_id:
            return cors_response(400, {"error": "Missing followed_id"})

        key = {"follower_id": follower_id, "followed_id": followed_id}
        existing = follows_table.get_item(Key=key).get("Item")

        if existing:
            follows_table.delete_item(Key=key)
            return cors_response(200, {"status": "unfollowed"})
        else:
            follows_table.put_item(Item={**key, "timestamp": int(time.time() * 1000)})
            return cors_response(200, {"status": "followed"})

    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})
    
def handle_get_following(event):
    try:
        claims = get_user_claims(event)
        user_id = claims.get("sub")

        resp = follows_table.query(
            KeyConditionExpression=Key("follower_id").eq(user_id)
        )
        followed_ids = [item["followed_id"] for item in resp.get("Items", [])]
        return cors_response(200, {"following": followed_ids})
    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})
    

def handle_project_post(event):
    try:
        claims = get_user_claims(event)
        user_id = claims.get("sub")
        body = json.loads(event.get("body", "{}"))
        
        project_id = str(uuid.uuid4())
        item = {
            "id": project_id,
            "userId": user_id,
            "name": body.get("name"),
            "slug": body.get("slug"),
            "background_url": body.get("background_url", ""),
            "tags": body.get("tags", []),
            "default_tag": body.get("default_tag", ""),
            "layout_css": body.get("layout_css", ""),
            "post_css": body.get("post_css", ""),
            "default_layout": body.get("default_layout", "columns"),
            "created_at": int(time.time() * 1000)
        }
        
        projects_table.put_item(Item=item)
        return cors_response(200, {"message": "Project created", "id": project_id})
    except Exception as e:
        return cors_response(500, {"error": str(e), "traceback": traceback.format_exc()})
    
def handle_project_get(event):
    try:
        qs = event.get("queryStringParameters") or {}
        project_id = qs.get("id")
        
        if not project_id:
            return cors_response(400, {"error": "Missing project ID"})

        resp = projects_table.get_item(Key={"id": project_id})
        item = resp.get("Item")

        if not item:
            return cors_response(404, {"error": "Project not found"})

        return cors_response(200, decimal_to_native(item))

    except Exception as e:
        return cors_response(500, {
            "error": str(e),
            "traceback": traceback.format_exc()
        })

def handle_projects_list(event):
    try:
        qs = event.get("queryStringParameters") or {}
        user_id = qs.get("userId")

        if not user_id:
            return cors_response(400, {"error": "Missing userId"})

        resp = projects_table.query(
            IndexName="userId-index",
            KeyConditionExpression=Key("userId").eq(user_id)
        )
        items = resp.get("Items", [])

        return cors_response(200, decimal_to_native(items))

    except Exception as e:
        return cors_response(500, {
            "error": str(e),
            "traceback": traceback.format_exc()
        })

def handle_project_put(event):
    try:
        claims = get_user_claims(event)
        user_id = claims.get("sub")

        body = json.loads(event.get("body", "{}"))
        project_id = body.get("id")

        if not project_id:
            return cors_response(400, {"error": "Missing project ID"})

        # Get existing project
        resp = projects_table.get_item(Key={"id": project_id})
        item = resp.get("Item")

        if not item:
            return cors_response(404, {"error": "Project not found"})

        if item.get("userId") != user_id:
            return cors_response(403, {"error": "Not authorized"})

        # Fields allowed to update
        allowed_fields = [
            "name", "slug", "background_url", "tags", "default_tag",
            "layout_css", "post_css", "default_layout"
        ]
        update_fields = {k: v for k, v in body.items() if k in allowed_fields}

        if not update_fields:
            return cors_response(400, {"error": "No valid fields to update"})

        # Build update expression
        update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in update_fields)
        expr_names = {f"#{k}": k for k in update_fields}
        expr_values = {f":{k}": v for k, v in update_fields.items()}

        projects_table.update_item(
            Key={"id": project_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values
        )

        return cors_response(200, {"message": "Project updated"})

    except Exception as e:
        return cors_response(500, {
            "error": str(e),
            "traceback": traceback.format_exc()
        })
    
def handle_project_delete(event):
    #TODO: delete related posts/images
    try:
        claims = get_user_claims(event)
        user_id = claims.get("sub")

        qs = event.get("queryStringParameters") or {}
        project_id = qs.get("id")

        if not project_id:
            return cors_response(400, {"error": "Missing project ID"})

        # Fetch the project to check ownership
        resp = projects_table.get_item(Key={"id": project_id})
        item = resp.get("Item")

        if not item:
            return cors_response(404, {"error": "Project not found"})

        if item.get("userId") != user_id:
            return cors_response(403, {"error": "Not authorized"})

        # Delete the project
        projects_table.delete_item(Key={"id": project_id})

        return cors_response(200, {"message": f"Project {project_id} deleted"})

    except Exception as e:
        return cors_response(500, {
            "error": str(e),
            "traceback": traceback.format_exc()
        })





# CORS helper
def cors_response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,x-amz-acl"
        },
        "body": json.dumps(body_dict)
    }
