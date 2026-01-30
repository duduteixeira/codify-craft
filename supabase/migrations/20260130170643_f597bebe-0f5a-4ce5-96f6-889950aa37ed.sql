-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Create enum for activity status
CREATE TYPE public.activity_status AS ENUM ('draft', 'generating', 'generated', 'deploying', 'deployed', 'failed');

-- Create enum for git provider
CREATE TYPE public.git_provider AS ENUM ('github', 'gitlab', 'bitbucket');

-- Create enum for deploy provider
CREATE TYPE public.deploy_provider AS ENUM ('vercel', 'render', 'railway', 'heroku');

-- Create enum for subscription plan
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'enterprise');

-- Profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Custom Activities table
CREATE TABLE public.custom_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status activity_status NOT NULL DEFAULT 'draft',
    original_prompt TEXT NOT NULL,
    extracted_requirements JSONB,
    javascript_code JSONB,
    nodejs_code JSONB,
    selected_version TEXT CHECK (selected_version IN ('javascript', 'nodejs')),
    config_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    generated_at TIMESTAMP WITH TIME ZONE,
    deployed_at TIMESTAMP WITH TIME ZONE
);

-- Git integrations table (encrypted tokens)
CREATE TABLE public.git_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider git_provider NOT NULL,
    account_username TEXT,
    access_token_encrypted TEXT,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Git repositories linked to activities
CREATE TABLE public.git_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_activity_id UUID REFERENCES public.custom_activities(id) ON DELETE CASCADE NOT NULL,
    git_integration_id UUID REFERENCES public.git_integrations(id) ON DELETE CASCADE NOT NULL,
    provider git_provider NOT NULL,
    repository_name TEXT NOT NULL,
    repository_url TEXT NOT NULL,
    repository_id TEXT,
    branch TEXT DEFAULT 'main',
    last_commit_sha TEXT,
    last_commit_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deployments table
CREATE TABLE public.deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_activity_id UUID REFERENCES public.custom_activities(id) ON DELETE CASCADE NOT NULL,
    provider deploy_provider NOT NULL,
    deployment_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deploying', 'live', 'failed')),
    base_url TEXT,
    execute_url TEXT,
    save_url TEXT,
    publish_url TEXT,
    validate_url TEXT,
    build_logs TEXT,
    error_message TEXT,
    environment JSONB,
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User billing/subscription table
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan subscription_plan NOT NULL DEFAULT 'free',
    custom_activities_count INTEGER DEFAULT 0,
    ai_generations_count INTEGER DEFAULT 0,
    current_period_start DATE,
    current_period_end DATE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.git_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.git_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage roles, users can view their own)
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- Custom activities policies
CREATE POLICY "Users can view their own activities" 
ON public.custom_activities FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities" 
ON public.custom_activities FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" 
ON public.custom_activities FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" 
ON public.custom_activities FOR DELETE 
USING (auth.uid() = user_id);

-- Git integrations policies
CREATE POLICY "Users can view their own git integrations" 
ON public.git_integrations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own git integrations" 
ON public.git_integrations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own git integrations" 
ON public.git_integrations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own git integrations" 
ON public.git_integrations FOR DELETE 
USING (auth.uid() = user_id);

-- Git repositories policies (via activity ownership)
CREATE POLICY "Users can view repos for their activities" 
ON public.git_repositories FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.custom_activities 
        WHERE id = custom_activity_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create repos for their activities" 
ON public.git_repositories FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.custom_activities 
        WHERE id = custom_activity_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update repos for their activities" 
ON public.git_repositories FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.custom_activities 
        WHERE id = custom_activity_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete repos for their activities" 
ON public.git_repositories FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.custom_activities 
        WHERE id = custom_activity_id AND user_id = auth.uid()
    )
);

-- Deployments policies (via activity ownership)
CREATE POLICY "Users can view deployments for their activities" 
ON public.deployments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.custom_activities 
        WHERE id = custom_activity_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create deployments for their activities" 
ON public.deployments FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.custom_activities 
        WHERE id = custom_activity_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update deployments for their activities" 
ON public.deployments FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.custom_activities 
        WHERE id = custom_activity_id AND user_id = auth.uid()
    )
);

-- User subscriptions policies
CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" 
ON public.user_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" 
ON public.user_subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_activities_updated_at
    BEFORE UPDATE ON public.custom_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create profile and subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    -- Create default subscription
    INSERT INTO public.user_subscriptions (user_id, plan)
    VALUES (NEW.id, 'free');
    
    -- Create default member role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_custom_activities_user_id ON public.custom_activities(user_id);
CREATE INDEX idx_custom_activities_status ON public.custom_activities(status);
CREATE INDEX idx_git_integrations_user_id ON public.git_integrations(user_id);
CREATE INDEX idx_git_repositories_activity_id ON public.git_repositories(custom_activity_id);
CREATE INDEX idx_deployments_activity_id ON public.deployments(custom_activity_id);
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);